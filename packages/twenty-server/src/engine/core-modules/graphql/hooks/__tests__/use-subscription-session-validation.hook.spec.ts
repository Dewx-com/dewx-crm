import { envelop, isAsyncIterable, useEngine, useSchema } from '@envelop/core';
import { type Request } from 'express';
import {
  buildSchema,
  execute,
  type ExecutionResult,
  parse,
  subscribe,
  validate,
} from 'graphql';

import { type GraphQLContext } from 'src/engine/api/graphql/graphql-config/interfaces/graphql-context.interface';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { useSubscriptionSessionValidation } from 'src/engine/core-modules/graphql/hooks/use-subscription-session-validation.hook';

const accountA = {
  workspace: { id: 'account-a' },
  userWorkspaceId: 'member-a',
} as AuthContext;
const accountB = {
  workspace: { id: 'account-b' },
  userWorkspaceId: 'member-b',
} as AuthContext;
const schema = buildSchema(
  'type Query { ready: Boolean } type Subscription { counter: Int }',
);

const openStream = async ({
  initial = accountA,
  validateRequest,
  enabled = true,
}: {
  initial?: AuthContext;
  validateRequest: (request: Request) => Promise<AuthContext>;
  enabled?: boolean;
}) => {
  const cleanup = jest.fn();
  const getEnveloped = envelop({
    plugins: [
      useEngine({ parse, validate, execute, subscribe }),
      useSchema(schema),
      useSubscriptionSessionValidation({ isEnabled: enabled, validateRequest }),
    ],
  });
  const engine = getEnveloped({
    req: { ...initial, headers: {} },
  } as GraphQLContext);
  const result = await engine.subscribe({
    schema,
    document: parse('subscription { counter }'),
    contextValue: await engine.contextFactory(),
    rootValue: {
      counter: async function* () {
        try {
          yield { counter: 1 };
          yield { counter: 2 };
        } finally {
          cleanup();
        }
      },
    },
  });
  if (!isAsyncIterable<ExecutionResult>(result))
    throw new Error('Expected a subscription');
  return { iterator: result[Symbol.asyncIterator](), cleanup };
};

describe('subscription delivery rechecks current account access', () => {
  it('drops an already queued event after removal while preserving another account stream', async () => {
    let removed = false;
    const validateRequest = async (request: Request) => {
      if (request.userWorkspaceId === accountB.userWorkspaceId) return accountB;
      if (removed) throw new Error('Membership removed');
      return accountA;
    };
    const a = await openStream({ validateRequest });
    const b = await openStream({ initial: accountB, validateRequest });
    expect((await a.iterator.next()).value.data.counter).toBe(1);
    removed = true;
    expect((await a.iterator.next()).done).toBe(true);
    expect(a.cleanup).toHaveBeenCalledTimes(1);
    expect((await b.iterator.next()).value.data.counter).toBe(1);
    await b.iterator.return?.();
  });

  it.each(['session expired', 'session revoked', 'authorization unavailable'])(
    'closes without delivering data when %s',
    async (reason) => {
      const { iterator, cleanup } = await openStream({
        validateRequest: async () => {
          throw new Error(reason);
        },
      });
      expect((await iterator.next()).done).toBe(true);
      expect(cleanup).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    accountB,
    { workspace: accountA.workspace, userWorkspaceId: 'another-member' },
    { workspace: accountA.workspace, apiKey: { id: 'key' } },
    {},
  ])('denies a changed identity or account: %j', async (current) => {
    const { iterator, cleanup } = await openStream({
      validateRequest: async () => current as AuthContext,
    });
    expect((await iterator.next()).done).toBe(true);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('rechecks an API credential and stops after it is revoked', async () => {
    const initial = {
      workspace: accountA.workspace,
      apiKey: { id: 'api-key' },
    } as AuthContext;
    const validateRequest = jest
      .fn()
      .mockResolvedValueOnce(initial)
      .mockRejectedValueOnce(new Error('API key revoked'));
    const { iterator, cleanup } = await openStream({
      initial,
      validateRequest,
    });
    expect((await iterator.next()).value.data.counter).toBe(1);
    expect((await iterator.next()).done).toBe(true);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('preserves the existing transport when shared-host mode is disabled', async () => {
    const validateRequest = jest.fn();
    const { iterator, cleanup } = await openStream({
      enabled: false,
      validateRequest,
    });
    expect((await iterator.next()).value.data.counter).toBe(1);
    await iterator.return?.();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(validateRequest).not.toHaveBeenCalled();
  });
});
