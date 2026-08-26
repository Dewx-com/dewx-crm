import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PermissionsGraphqlApiExceptionFilter } from 'src/engine/metadata-modules/permissions/utils/permissions-graphql-api-exception.filter';
import { DeleteRoleRecordScopeInput } from 'src/engine/metadata-modules/role-record-scope/dtos/delete-role-record-scope.input';
import { RoleRecordScopeDTO } from 'src/engine/metadata-modules/role-record-scope/dtos/role-record-scope.dto';
import { UpsertRoleRecordScopeInput } from 'src/engine/metadata-modules/role-record-scope/dtos/upsert-role-record-scope.input';
import { RoleRecordScopeService } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.service';

// Managing a scope is a ROLES setting, same gate as object permissions.
@MetadataResolver(() => RoleRecordScopeDTO)
@UsePipes(ResolverValidationPipe)
@UseGuards(
  WorkspaceAuthGuard,
  SettingsPermissionGuard(PermissionFlagType.ROLES),
)
@UseFilters(
  PermissionsGraphqlApiExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
)
export class RoleRecordScopeResolver {
  constructor(
    private readonly roleRecordScopeService: RoleRecordScopeService,
  ) {}

  @Query(() => [RoleRecordScopeDTO])
  async roleRecordScopes(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('roleId', { type: () => UUIDScalarType }) roleId: string,
  ): Promise<RoleRecordScopeDTO[]> {
    return this.roleRecordScopeService.findByRole(workspace.id, roleId);
  }

  @Mutation(() => RoleRecordScopeDTO)
  async upsertRoleRecordScope(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: UpsertRoleRecordScopeInput,
  ): Promise<RoleRecordScopeDTO> {
    return this.roleRecordScopeService.upsert({
      workspaceId: workspace.id,
      ...input,
    });
  }

  @Mutation(() => Boolean)
  async deleteRoleRecordScope(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: DeleteRoleRecordScopeInput,
  ): Promise<boolean> {
    return this.roleRecordScopeService.delete({
      workspaceId: workspace.id,
      ...input,
    });
  }
}
