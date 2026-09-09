import { createHash } from 'node:crypto';

import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { WorkspaceCreationRequestEntity } from 'src/engine/core-modules/auth/entities/workspace-creation-request.entity';
import { SignInUpService } from 'src/engine/core-modules/auth/services/sign-in-up.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const user = { id: 'user', email: 'owner@example.invalid' } as UserEntity;
const requestId = '72c8ef0c-c724-4b97-a725-e83293476135';
const input = { displayName: 'Customer CRM', requestId };
const userData = { type: 'existingUser' as const, existingUser: user };

const setup = () => {
  const workspace: Partial<WorkspaceEntity> = {
    id: 'original-account',
    activationStatus: WorkspaceActivationStatus.ACTIVE,
  };
  const rows = new Map<unknown, unknown>([
    [
      WorkspaceCreationRequestEntity,
      {
        userId: user.id,
        requestId,
        workspaceId: workspace.id,
        payloadHash: createHash('sha256')
          .update(
            JSON.stringify({ displayName: input.displayName, subdomain: null }),
          )
          .digest('hex'),
      },
    ],
    [WorkspaceEntity, workspace],
    [UserWorkspaceEntity, { id: 'original-membership' }],
  ]);
  const manager = {
    findOneBy: jest.fn(async (entity) => rows.get(entity) ?? null),
    save: jest.fn(),
    insert: jest.fn(),
  };
  const queryRunner = { manager, query: jest.fn() };
  const capacity = jest
    .fn()
    .mockRejectedValue(new Error('Workspace limit reached'));
  const event = jest.fn();
  const service: SignInUpService = Object.assign(
    Object.create(SignInUpService.prototype),
    {
      assertWorkspaceCreationAllowed: capacity,
      twentyConfigService: {
        get: (key: string) => key === 'IS_SHARED_DOMAIN_ENABLED',
      },
      dataSource: {
        transaction: (run: (value: unknown) => unknown) => run({ queryRunner }),
      },
      billingService: { isBillingEnabled: () => false },
      workspaceCacheService: { invalidateAndRecompute: jest.fn() },
      eventLogEmitterService: {
        createContext: () => ({ insertWorkspaceEvent: event }),
      },
    },
  );
  return { service, rows, workspace, manager, queryRunner, capacity, event };
};

describe('account setup retries', () => {
  it('returns the committed account even at capacity without recreating membership or events', async () => {
    const { service, workspace, manager, capacity, event } = setup();
    const result = await service.signUpOnNewWorkspace(userData, input);
    expect(result).toEqual({ user, workspace });
    expect(manager.findOneBy).toHaveBeenCalledWith(
      WorkspaceCreationRequestEntity,
      {
        userId: user.id,
        requestId,
      },
    );
    expect(capacity).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
    expect(event).not.toHaveBeenCalled();
  });

  it('rejects a reused request with different details', async () => {
    const { service, capacity } = setup();
    await expect(
      service.signUpOnNewWorkspace(userData, {
        ...input,
        displayName: 'Different CRM',
      }),
    ).rejects.toThrow('already used with different details');
    expect(capacity).not.toHaveBeenCalled();
  });

  it.each([WorkspaceEntity, UserWorkspaceEntity])(
    'does not recreate a deleted account or removed membership (%p)',
    async (entity) => {
      const { service, rows, manager } = setup();
      rows.delete(entity);
      await expect(
        service.signUpOnNewWorkspace(userData, input),
      ).rejects.toThrow('no longer available');
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    },
  );

  it.each([
    WorkspaceActivationStatus.SUSPENDED,
    WorkspaceActivationStatus.INACTIVE,
  ])(
    'does not reactivate an unavailable account (%s)',
    async (activationStatus) => {
      const { service, workspace } = setup();
      workspace.activationStatus = activationStatus;
      await expect(
        service.signUpOnNewWorkspace(userData, input),
      ).rejects.toThrow('no longer available');
    },
  );

  it.each([undefined, 'not-a-uuid'])(
    'requires a valid request ID in shared mode (%s)',
    async (invalidId) => {
      const { service, queryRunner } = setup();
      await expect(
        service.signUpOnNewWorkspace(userData, {
          ...input,
          requestId: invalidId,
        }),
      ).rejects.toThrow('valid account setup request ID');
      expect(queryRunner.query).not.toHaveBeenCalled();
    },
  );

  it('checks the real capacity limit for a new request under the creation lock', async () => {
    const { service, rows, capacity, queryRunner } = setup();
    rows.delete(WorkspaceCreationRequestEntity);
    await expect(service.signUpOnNewWorkspace(userData, input)).rejects.toThrow(
      'Workspace limit reached',
    );
    expect(queryRunner.query.mock.invocationCallOrder[0]).toBeLessThan(
      capacity.mock.invocationCallOrder[0],
    );
  });
});
