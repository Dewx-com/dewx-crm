import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { RoleRecordScopeEntity } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.entity';
import { RoleRecordScopeResolver } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.resolver';
import { RoleRecordScopeService } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.service';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleRecordScopeEntity, RoleEntity]),
    WorkspaceCacheModule,
    // The resolver is gated by SettingsPermissionGuard(ROLES), and that guard injects
    // PermissionsService, so the module providing it has to be imported here — same as role.module.
    PermissionsModule,
  ],
  providers: [RoleRecordScopeService, RoleRecordScopeResolver],
  exports: [RoleRecordScopeService],
})
export class RoleRecordScopeModule {}
