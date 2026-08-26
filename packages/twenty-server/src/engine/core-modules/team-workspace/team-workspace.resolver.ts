import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { TeamWorkspaceSnapshotDTO } from 'src/engine/core-modules/team-workspace/dtos/team-workspace-snapshot.dto';
import { TeamManagementSnapshotDTO } from 'src/engine/core-modules/team-workspace/dtos/team-management-snapshot.dto';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';
import { TeamWorkspaceService } from 'src/engine/core-modules/team-workspace/team-workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { CompleteTaskWithEvidenceInput } from 'src/modules/team-workspace/commands/dtos/complete-task-with-evidence.input';
import { CreateTeamWorkspaceAssignedWorkInput } from 'src/modules/team-workspace/commands/dtos/create-team-workspace-assigned-work.input';
import { CreateTeamWorkspaceProtocolTaskInput } from 'src/modules/team-workspace/commands/dtos/create-team-workspace-protocol-task.input';
import { TeamWorkspaceCommandReceiptDto } from 'src/modules/team-workspace/commands/dtos/team-workspace-command-receipt.dto';
import { TransitionTeamWorkspaceTaskInput } from 'src/modules/team-workspace/commands/dtos/transition-team-workspace-task.input';
import { UpdateTeamWorkspaceOpportunityStageInput } from 'src/modules/team-workspace/commands/dtos/update-team-workspace-opportunity-stage.input';
import { WinOpportunityWithHandoffInput } from 'src/modules/team-workspace/commands/dtos/win-opportunity-with-handoff.input';
import { TeamWorkspaceCommandService } from 'src/modules/team-workspace/commands/team-workspace-command.service';

@CoreResolver()
@UseGuards(WorkspaceAuthGuard, CustomPermissionGuard)
export class TeamWorkspaceResolver {
  constructor(
    private readonly teamWorkspaceService: TeamWorkspaceService,
    private readonly teamWorkspaceCommandService: TeamWorkspaceCommandService,
  ) {}

  @Query(() => TeamWorkspaceSnapshotDTO)
  async teamWorkspaceSnapshot(
    @Args('lane', { type: () => TeamWorkspaceLane }) lane: TeamWorkspaceLane,
  ): Promise<TeamWorkspaceSnapshotDTO> {
    const authContext = getWorkspaceAuthContext();

    if (authContext.type !== 'user') {
      return this.teamWorkspaceService.getSnapshotForAuthContext({
        lane,
        authContext,
      });
    }

    return this.teamWorkspaceService.getSnapshot({
      lane,
      workspace: authContext.workspace as unknown as WorkspaceEntity,
      userWorkspaceId: authContext.userWorkspaceId,
      workspaceMemberId: authContext.workspaceMemberId,
    });
  }

  @Query(() => TeamManagementSnapshotDTO)
  async teamManagementSnapshot(): Promise<TeamManagementSnapshotDTO> {
    return this.teamWorkspaceService.getManagementSnapshotForAuthContext(
      getWorkspaceAuthContext(),
    );
  }

  @Mutation(() => TeamWorkspaceCommandReceiptDto)
  async completeTaskWithEvidence(
    @Args('input') input: CompleteTaskWithEvidenceInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    return this.teamWorkspaceCommandService.completeTaskWithEvidence(
      getWorkspaceAuthContext(),
      input,
    );
  }

  @Mutation(() => TeamWorkspaceCommandReceiptDto)
  async createAssignedWork(
    @Args('input') input: CreateTeamWorkspaceAssignedWorkInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    return this.teamWorkspaceCommandService.createAssignedWork(
      getWorkspaceAuthContext(),
      input,
    );
  }

  @Mutation(() => TeamWorkspaceCommandReceiptDto)
  async winOpportunityWithHandoff(
    @Args('input') input: WinOpportunityWithHandoffInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    return this.teamWorkspaceCommandService.winOpportunityWithHandoff(
      getWorkspaceAuthContext(),
      input,
    );
  }

  @Mutation(() => TeamWorkspaceCommandReceiptDto)
  async createProtocolTask(
    @Args('input') input: CreateTeamWorkspaceProtocolTaskInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    return this.teamWorkspaceCommandService.createProtocolTask(
      getWorkspaceAuthContext(),
      input,
    );
  }

  @Mutation(() => TeamWorkspaceCommandReceiptDto)
  async transitionTaskStatus(
    @Args('input') input: TransitionTeamWorkspaceTaskInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    return this.teamWorkspaceCommandService.transitionTaskStatus(
      getWorkspaceAuthContext(),
      input,
    );
  }

  @Mutation(() => TeamWorkspaceCommandReceiptDto)
  async updateOpportunityStage(
    @Args('input') input: UpdateTeamWorkspaceOpportunityStageInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    return this.teamWorkspaceCommandService.updateOpportunityStage(
      getWorkspaceAuthContext(),
      input,
    );
  }
}
