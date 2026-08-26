import { Module } from '@nestjs/common';

import { ApiKeyModule } from 'src/engine/core-modules/api-key/api-key.module';
import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { TeamWorkspaceResolver } from 'src/engine/core-modules/team-workspace/team-workspace.resolver';
import { TeamWorkspaceService } from 'src/engine/core-modules/team-workspace/team-workspace.service';
import { RoleModule } from 'src/engine/metadata-modules/role/role.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { TeamWorkspaceCommandService } from 'src/modules/team-workspace/commands/team-workspace-command.service';

@Module({
  imports: [
    ApiKeyModule,
    GlobalWorkspaceDataSourceModule,
    RoleModule,
    UserRoleModule,
    WorkspaceDomainsModule,
  ],
  providers: [
    TeamWorkspaceCommandService,
    TeamWorkspaceResolver,
    TeamWorkspaceService,
  ],
  exports: [TeamWorkspaceCommandService, TeamWorkspaceService],
})
export class TeamWorkspaceModule {}
