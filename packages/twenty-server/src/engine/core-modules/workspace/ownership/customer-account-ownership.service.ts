import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { type AllMetadataName } from 'twenty-shared/metadata';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { assertIsDefinedOrThrow } from 'twenty-shared/utils';
import { DataSource, type QueryRunner } from 'typeorm';

import { PostgresAdvisoryLockService } from 'src/database/typeorm/postgres-advisory-lock.service';
import { CoreEntityCacheService } from 'src/engine/core-entity-cache/services/core-entity-cache.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

export const CUSTOMER_ACCOUNT_ACCESS_LOCK = 'customer-account-access';
export const OWNER_PERMISSION_METADATA_NAMES = new Set<AllMetadataName>([
  'role',
  'roleTarget',
  'rolePermissionFlag',
  'objectPermission',
  'fieldPermission',
  'rowLevelPermissionPredicate',
  'rowLevelPermissionPredicateGroup',
]);

@Injectable()
export class CustomerAccountOwnershipService {
  private readonly logger = new Logger(CustomerAccountOwnershipService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly advisoryLockService: PostgresAdvisoryLockService,
    private readonly coreEntityCacheService: CoreEntityCacheService,
  ) {}

  async runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    // ponytail: one lock serializes infrequent team changes, including user
    // deletion across accounts. Use ordered per-account locks if contention grows.
    const result = await this.advisoryLockService.tryWithLock(
      CUSTOMER_ACCOUNT_ACCESS_LOCK,
      callback,
    );
    if (!result.acquired) {
      throw new ConflictException(
        'Account access is being updated. Try again.',
      );
    }
    return result.value;
  }

  async getWorkspace(workspaceId: string, queryRunner?: QueryRunner) {
    const repository = (
      queryRunner?.manager ?? this.dataSource.manager
    ).getRepository(WorkspaceEntity);
    return repository.findOneByOrFail({ id: workspaceId });
  }

  async assertUserCanLeave(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId);
    if (workspace.primaryOwnerUserId === userId) {
      throw new ForbiddenException(
        'Transfer ownership before removing the account owner.',
      );
    }
  }

  assertCurrentOwner(workspace: WorkspaceEntity, userId: string): void {
    if (
      !workspace.primaryOwnerUserId ||
      workspace.primaryOwnerUserId !== userId
    ) {
      throw new ForbiddenException('Only the account owner can do this.');
    }
  }

  isOwnedAndReady(workspace: WorkspaceEntity): boolean {
    return (
      Boolean(workspace.primaryOwnerUserId) &&
      [
        WorkspaceActivationStatus.ACTIVE,
        WorkspaceActivationStatus.CREATED,
        WorkspaceActivationStatus.SUSPENDED,
        WorkspaceActivationStatus.INACTIVE,
      ].includes(workspace.activationStatus)
    );
  }

  private async isActiveAdministrator(
    workspaceId: string,
    userId: string,
    queryRunner: QueryRunner,
  ): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT uw.id
       FROM core."userWorkspace" uw
       JOIN core."user" u ON u.id = uw."userId" AND u."deletedAt" IS NULL
       JOIN core."roleTarget" rt ON rt."userWorkspaceId" = uw.id AND rt."workspaceId" = uw."workspaceId"
       JOIN core.role r ON r.id = rt."roleId" AND r."workspaceId" = uw."workspaceId"
       WHERE uw."workspaceId" = $1 AND uw."userId" = $2
         AND uw."deletedAt" IS NULL AND r."universalIdentifier" = $3
         AND r."canUpdateAllSettings" = true AND r."canReadAllObjectRecords" = true
         AND r."canAccessAllTools" = true AND r."canUpdateAllObjectRecords" = true
         AND r."canSoftDeleteAllObjectRecords" = true AND r."canDestroyAllObjectRecords" = true
         AND NOT EXISTS (SELECT 1 FROM core."objectPermission" p WHERE p."roleId" = r.id AND p."workspaceId" = $1
           AND (p."canReadObjectRecords" = false OR p."canUpdateObjectRecords" = false
             OR p."canSoftDeleteObjectRecords" = false OR p."canDestroyObjectRecords" = false))
         AND NOT EXISTS (SELECT 1 FROM core."fieldPermission" p WHERE p."roleId" = r.id AND p."workspaceId" = $1
           AND (p."canReadFieldValue" = false OR p."canUpdateFieldValue" = false))
         AND NOT EXISTS (SELECT 1 FROM core."rowLevelPermissionPredicate" p WHERE p."roleId" = r.id AND p."workspaceId" = $1)
         AND NOT EXISTS (SELECT 1 FROM core."rowLevelPermissionPredicateGroup" p WHERE p."roleId" = r.id AND p."workspaceId" = $1)
         AND NOT EXISTS (SELECT 1 FROM core."roleRecordScope" p WHERE p."roleId" = r.id AND p."workspaceId" = $1)
       LIMIT 1`,
      [workspaceId, userId, STANDARD_ROLE.admin.universalIdentifier],
    );
    return rows.length === 1;
  }

  async assertOwnerRemainsAdministrator(
    workspaceId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId, queryRunner);
    const ownerId = workspace.primaryOwnerUserId;
    if (!ownerId || !this.isOwnedAndReady(workspace)) return;
    if (
      !(await this.isActiveAdministrator(workspaceId, ownerId, queryRunner))
    ) {
      throw new ForbiddenException(
        'The account owner must remain an administrator. Transfer ownership first.',
      );
    }
  }

  async transfer({
    workspaceId,
    actingUserId,
    nextOwnerUserId,
  }: {
    workspaceId: string;
    actingUserId: string;
    nextOwnerUserId: string;
  }): Promise<WorkspaceEntity> {
    return this.runExclusive(async () => {
      const workspace = await this.dataSource.transaction(async (manager) => {
        const queryRunner = manager.queryRunner;
        assertIsDefinedOrThrow(queryRunner);
        const current = await this.getWorkspace(workspaceId, queryRunner);
        this.assertCurrentOwner(current, actingUserId);
        if (
          ![
            WorkspaceActivationStatus.ACTIVE,
            WorkspaceActivationStatus.CREATED,
          ].includes(current.activationStatus)
        ) {
          throw new ForbiddenException(
            'This account is not available for ownership transfer.',
          );
        }
        if (
          !(await this.isActiveAdministrator(
            workspaceId,
            nextOwnerUserId,
            queryRunner,
          ))
        ) {
          throw new ForbiddenException(
            'Choose an existing administrator from this account.',
          );
        }
        await manager.update(
          WorkspaceEntity,
          { id: workspaceId },
          {
            primaryOwnerUserId: nextOwnerUserId,
          },
        );
        return { ...current, primaryOwnerUserId: nextOwnerUserId };
      });
      await this.coreEntityCacheService.invalidate(
        'workspaceEntity',
        workspaceId,
      );
      this.logger.log({
        event: 'customer-account-ownership-transferred',
        workspaceId,
        previousOwnerUserId: actingUserId,
        nextOwnerUserId,
      });
      return workspace;
    });
  }
}
