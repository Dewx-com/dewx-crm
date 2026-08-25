import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ROLE_RECORD_SCOPE_TABLE_SQL } from 'src/engine/metadata-modules/role-record-scope/constants/role-record-scope-table-sql.constant';
import { RoleRecordScopeEntity } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

// Prospect Engine record scopes — our own, AGPL. Writes go through here so every change also
// recomputes the roles-permissions cache, exactly like object permissions do.
@Injectable()
export class RoleRecordScopeService implements OnModuleInit {
  private readonly logger = new Logger(RoleRecordScopeService.name);

  constructor(
    @InjectRepository(RoleRecordScopeEntity)
    private readonly roleRecordScopeRepository: Repository<RoleRecordScopeEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {}

  // Idempotent: the same SQL the instance command runs, so an install that never ran the
  // upgrade command still has the table. Never fails the boot.
  async onModuleInit(): Promise<void> {
    try {
      for (const statement of ROLE_RECORD_SCOPE_TABLE_SQL) {
        await this.roleRecordScopeRepository.query(statement);
      }
    } catch (error) {
      this.logger.warn(
        `roleRecordScope table check failed: ${(error as Error)?.message}`,
      );
    }
  }

  async findByRole(
    workspaceId: string,
    roleId: string,
  ): Promise<RoleRecordScopeEntity[]> {
    return this.roleRecordScopeRepository.find({
      where: { workspaceId, roleId },
      order: { createdAt: 'ASC' },
    });
  }

  async upsert(input: {
    workspaceId: string;
    roleId: string;
    objectMetadataId: string;
    fieldMetadataId: string;
    value: string;
  }): Promise<RoleRecordScopeEntity> {
    await this.assertRoleInWorkspace(input.workspaceId, input.roleId);

    // Keyed by FIELD, not just by object, so one object can carry more than one condition and they
    // are ANDed in the query (the util already loops over the list). That is what lets a client role
    // say "client = TALENTLAB" AND "status = PUBLISHED" on the same object — the publication gate.
    // Keyed by object alone, the second condition silently replaced the first and a client read every
    // draft in the workspace: found by the adversarial pass on 2026-08-22, before anyone was invited.
    const existing = await this.roleRecordScopeRepository.findOne({
      where: {
        workspaceId: input.workspaceId,
        roleId: input.roleId,
        objectMetadataId: input.objectMetadataId,
        fieldMetadataId: input.fieldMetadataId,
      },
    });

    const saved = await this.roleRecordScopeRepository.save(
      existing
        ? {
            ...existing,
            fieldMetadataId: input.fieldMetadataId,
            value: input.value,
          }
        : this.roleRecordScopeRepository.create(input),
    );

    await this.workspaceCacheService.invalidateAndRecompute(input.workspaceId, [
      'rolesPermissions',
    ]);

    return saved;
  }

  async delete(input: {
    workspaceId: string;
    roleId: string;
    objectMetadataId: string;
    // Optional: drop ONE condition. Omitted, every condition on that object goes — which is what a
    // caller means by "this object is no longer scoped", and is the safe direction to be wrong in.
    fieldMetadataId?: string;
  }): Promise<boolean> {
    await this.assertRoleInWorkspace(input.workspaceId, input.roleId);

    const result = await this.roleRecordScopeRepository.delete({
      workspaceId: input.workspaceId,
      roleId: input.roleId,
      objectMetadataId: input.objectMetadataId,
      ...(input.fieldMetadataId ? { fieldMetadataId: input.fieldMetadataId } : {}),
    });

    await this.workspaceCacheService.invalidateAndRecompute(input.workspaceId, [
      'rolesPermissions',
    ]);

    return (result.affected ?? 0) > 0;
  }

  private async assertRoleInWorkspace(
    workspaceId: string,
    roleId: string,
  ): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, workspaceId },
    });

    if (!role) {
      throw new Error(`Role ${roleId} does not exist in this workspace`);
    }
  }
}
