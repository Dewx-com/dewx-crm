import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { type DataSource, type QueryRunner } from 'typeorm';

import { type PostgresAdvisoryLockService } from 'src/database/typeorm/postgres-advisory-lock.service';
import { type CoreEntityCacheService } from 'src/engine/core-entity-cache/services/core-entity-cache.service';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { CustomerAccountOwnershipService } from 'src/engine/core-modules/workspace/ownership/customer-account-ownership.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const setup = () => {
  const workspace = {
    id: 'account',
    primaryOwnerUserId: 'owner',
    activationStatus: WorkspaceActivationStatus.ACTIVE,
  } as WorkspaceEntity;
  const administrator = jest.fn().mockResolvedValue([{ id: 'membership' }]);
  const repository = {
    findOneByOrFail: jest.fn(async (_criteria: { id: string }) => ({
      ...workspace,
    })),
  };
  const update = jest.fn(async (_entity, _criteria, value) =>
    Object.assign(workspace, value),
  );
  const manager = { getRepository: () => repository, update };
  const queryRunner = {
    manager,
    query: administrator,
  } as unknown as QueryRunner;
  const transactionManager = { ...manager, queryRunner };
  const dataSource = {
    manager,
    transaction: (callback: (manager: unknown) => unknown) =>
      callback(transactionManager),
  } as unknown as DataSource;
  const lock = jest.fn(async (_name, callback) => ({
    acquired: true,
    value: await callback(),
  }));
  const invalidate = jest.fn();
  const service = new CustomerAccountOwnershipService(
    dataSource,
    { tryWithLock: lock } as unknown as PostgresAdvisoryLockService,
    { invalidate } as unknown as CoreEntityCacheService,
  );
  return {
    service,
    workspace,
    administrator,
    repository,
    update,
    lock,
    invalidate,
    queryRunner,
  };
};

const transfer = {
  workspaceId: 'account',
  actingUserId: 'owner',
  nextOwnerUserId: 'next-owner',
};

describe('customer ownership', () => {
  it('transfers to a current account administrator and invalidates the account cache', async () => {
    const { service, workspace, administrator, invalidate } = setup();
    await service.transfer(transfer);
    expect(workspace.primaryOwnerUserId).toBe('next-owner');
    expect(administrator.mock.calls[0][1].slice(0, 2)).toEqual([
      'account',
      'next-owner',
    ]);
    expect(invalidate).toHaveBeenCalledWith('workspaceEntity', 'account');
    await expect(
      service.assertUserCanLeave('account', 'next-owner'),
    ).rejects.toThrow('Transfer ownership');
    await expect(
      service.assertUserCanLeave('account', 'owner'),
    ).resolves.toBeUndefined();
  });

  it('rejects another administrator acting as the owner', async () => {
    const { service, update } = setup();
    await expect(
      service.transfer({ ...transfer, actingUserId: 'agency-admin' }),
    ).rejects.toThrow('Only the account owner');
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a target without an active administrator membership in this account', async () => {
    const { service, administrator, update } = setup();
    administrator.mockResolvedValue([]);
    await expect(service.transfer(transfer)).rejects.toThrow(
      'existing administrator from this account',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses an unavailable account', async () => {
    const { service, workspace, update } = setup();
    workspace.activationStatus = WorkspaceActivationStatus.SUSPENDED;
    await expect(service.transfer(transfer)).rejects.toThrow('not available');
    expect(update).not.toHaveBeenCalled();
  });

  it('fails before writes when another access change holds the lock', async () => {
    const { service, lock, update } = setup();
    lock.mockImplementation(async () => ({
      acquired: false,
      value: undefined,
    }));
    await expect(service.transfer(transfer)).rejects.toThrow('being updated');
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses to commit role changes that leave the owner without administrator access', async () => {
    const { service, administrator, queryRunner } = setup();
    administrator.mockResolvedValue([]);
    await expect(
      service.assertOwnerRemainsAdministrator('account', queryRunner),
    ).rejects.toThrow('must remain an administrator');
  });

  it('allows the native initial role installation while the account is being created', async () => {
    const { service, workspace, administrator, queryRunner } = setup();
    workspace.activationStatus = WorkspaceActivationStatus.ONGOING_CREATION;
    await service.assertOwnerRemainsAdministrator('account', queryRunner);
    expect(administrator).not.toHaveBeenCalled();
  });

  it('does not infer an owner for a legacy account', async () => {
    const { service, workspace, update } = setup();
    workspace.primaryOwnerUserId = null;
    await expect(service.transfer(transfer)).rejects.toThrow(
      'Only the account owner',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('checks ownership in every account before deleting a user or any membership', async () => {
    const { service: ownership, repository, workspace } = setup();
    repository.findOneByOrFail.mockImplementation(
      async ({ id }: { id: string }) => ({
        ...workspace,
        id,
        primaryOwnerUserId: id === 'account' ? 'owner' : 'someone-else',
      }),
    );
    const remove = jest.fn();
    const softDelete = jest.fn();
    const service: UserService = Object.assign(
      Object.create(UserService.prototype),
      {
        customerAccountOwnershipService: ownership,
        userRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: 'owner',
            userWorkspaces: [
              { workspaceId: 'other-account', userId: 'owner' },
              { workspaceId: 'account', userId: 'owner' },
            ],
          }),
          softDelete,
        },
        removeUserFromWorkspaceWithAccessLock: remove,
      },
    );
    await expect(service.deleteUser('owner')).rejects.toThrow(
      'Transfer ownership',
    );
    expect(remove).not.toHaveBeenCalled();
    expect(softDelete).not.toHaveBeenCalled();
  });
});
