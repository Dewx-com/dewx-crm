import { isAsyncIterable, type Plugin } from '@envelop/core';
import { type Request } from 'express';
import { type ExecutionResult } from 'graphql';

import { type GraphQLContext } from 'src/engine/api/graphql/graphql-config/interfaces/graphql-context.interface';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';

export const useSubscriptionSessionValidation = ({
  isEnabled,
  validateRequest,
}: {
  isEnabled: boolean;
  validateRequest: (request: Request) => Promise<AuthContext>;
}): Plugin<GraphQLContext> => ({
  onSubscribe: ({ args }) => {
    if (!isEnabled) return;

    const request = args.contextValue.req;
    const workspaceId = request.workspace?.id;
    const userWorkspaceId = request.userWorkspaceId;
    const apiKeyId = request.apiKey?.id;
    const applicationId = request.application?.id;

    return {
      onSubscribeResult: ({ result, setResult }) => {
        if (!isAsyncIterable<ExecutionResult>(result)) return;

        setResult(
          (async function* () {
            // Guards authenticate the opening request only. Recheck after awaiting
            // each value so queued events cannot escape after access is removed.
            for await (const value of result) {
              try {
                const current = await validateRequest(request);
                if (
                  !workspaceId ||
                  (!userWorkspaceId && !apiKeyId && !applicationId) ||
                  current.workspace?.id !== workspaceId ||
                  current.userWorkspaceId !== userWorkspaceId ||
                  current.apiKey?.id !== apiKeyId ||
                  current.application?.id !== applicationId
                )
                  return;
              } catch {
                // Ending the generator closes its source iterator and its timers.
                return;
              }
              yield value;
            }
          })(),
        );
      },
    };
  },
});
