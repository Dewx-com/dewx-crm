import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleRecordScopeEntity } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.entity';
import { RoleRecordScopeResolver } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.resolver';
import { RoleRecordScopeService } from 'src/engine/metadata-modules/role-record-scope/role-record-scope.service';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleRecordScopeEntity, RoleEntity]),
    WorkspaceCacheModule,
  ],
  providers: [RoleRecordScopeService, RoleRecordScopeResolver],
  exports: [RoleRecordScopeService],
})
export class RoleRecordScopeModule {}
