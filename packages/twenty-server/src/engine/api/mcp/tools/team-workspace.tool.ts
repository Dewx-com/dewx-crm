import { z } from 'zod';

import { withWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';
import { type TeamWorkspaceService } from 'src/engine/core-modules/team-workspace/team-workspace.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  type CompleteTaskWithEvidenceInput,
  TEAM_WORKSPACE_COMPLETABLE_TASK_STATUSES,
} from 'src/modules/team-workspace/commands/dtos/complete-task-with-evidence.input';
import { type CreateTeamWorkspaceAssignedWorkInput } from 'src/modules/team-workspace/commands/dtos/create-team-workspace-assigned-work.input';
import {
  type CreateTeamWorkspaceProtocolTaskInput,
  TeamWorkspaceCommandLane,
  TeamWorkspaceMeetingOutcome,
  TeamWorkspaceProtocolTaskKind,
} from 'src/modules/team-workspace/commands/dtos/create-team-workspace-protocol-task.input';
import {
  TEAM_WORKSPACE_ACTIVE_TASK_STATUSES,
  type TransitionTeamWorkspaceTaskInput,
} from 'src/modules/team-workspace/commands/dtos/transition-team-workspace-task.input';
import {
  TEAM_WORKSPACE_NON_CUSTOMER_OPPORTUNITY_STAGES,
  type UpdateTeamWorkspaceOpportunityStageInput,
} from 'src/modules/team-workspace/commands/dtos/update-team-workspace-opportunity-stage.input';
import { type WinOpportunityWithHandoffInput } from 'src/modules/team-workspace/commands/dtos/win-opportunity-with-handoff.input';
import { type TeamWorkspaceCommandService } from 'src/modules/team-workspace/commands/team-workspace-command.service';

export const TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME = 'team_workspace_snapshot';
export const TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME =
  'team_workspace_complete_task';
export const TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME =
  'team_workspace_create_assigned_work';
export const TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME =
  'team_workspace_win_opportunity';
export const TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME =
  'team_workspace_create_protocol_task';
export const TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME =
  'team_workspace_transition_task_status';
export const TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME =
  'team_workspace_update_opportunity_stage';

const idempotencyKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/);
const nonEmptyTextSchema = (maximumLength: number) =>
  z.string().min(1).max(maximumLength).regex(/\S/);
const singleLineTextSchema = (maximumLength: number) =>
  nonEmptyTextSchema(maximumLength).regex(/^[^\r\n]+$/);
const recordVersionSchema = z.string().datetime({ offset: true });

export const teamWorkspaceSnapshotInputSchema = z
  .object({
    lane: z.enum([TeamWorkspaceLane.SALES, TeamWorkspaceLane.OPERATIONS]),
  })
  .strict();

export const teamWorkspaceCompleteTaskInputSchema = z
  .object({
    taskId: z.string().uuid(),
    expectedStatus: z.enum(TEAM_WORKSPACE_COMPLETABLE_TASK_STATUSES),
    expectedVersion: recordVersionSchema,
    evidence: nonEmptyTextSchema(12_000),
    source: singleLineTextSchema(2_000),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const teamWorkspaceCreateAssignedWorkInputSchema = z
  .object({
    lane: z.enum([
      TeamWorkspaceCommandLane.SALES,
      TeamWorkspaceCommandLane.OPERATIONS,
    ]),
    assigneeId: z.string().uuid(),
    title: singleLineTextSchema(180),
    detail: nonEmptyTextSchema(12_000),
    dueAt: recordVersionSchema,
    client: singleLineTextSchema(160).nullable().optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const teamWorkspaceWinOpportunityInputSchema = z
  .object({
    opportunityId: z.string().uuid(),
    expectedStage: singleLineTextSchema(100),
    expectedVersion: recordVersionSchema,
    company: singleLineTextSchema(160),
    contact: singleLineTextSchema(160),
    client: singleLineTextSchema(160),
    problem: nonEmptyTextSchema(12_000),
    agreedScope: nonEmptyTextSchema(12_000),
    promises: nonEmptyTextSchema(12_000),
    nextCommitment: nonEmptyTextSchema(12_000),
    evidence: nonEmptyTextSchema(12_000),
    source: singleLineTextSchema(2_000),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const teamWorkspaceCreateProtocolTaskInputSchema = z
  .object({
    kind: z.enum([
      TeamWorkspaceProtocolTaskKind.MEETING_PREP,
      TeamWorkspaceProtocolTaskKind.MEETING_OUTCOME,
      TeamWorkspaceProtocolTaskKind.COACHING_LESSON,
      TeamWorkspaceProtocolTaskKind.CLIENT_UPDATE,
      TeamWorkspaceProtocolTaskKind.BLOCKER,
      TeamWorkspaceProtocolTaskKind.HANDOFF_RETURN,
    ]),
    lane: z.enum([
      TeamWorkspaceCommandLane.SALES,
      TeamWorkspaceCommandLane.OPERATIONS,
    ]),
    targetId: z.string().uuid(),
    content: nonEmptyTextSchema(12_000),
    evidence: nonEmptyTextSchema(12_000),
    source: singleLineTextSchema(2_000),
    meetingOutcome: z
      .enum([
        TeamWorkspaceMeetingOutcome.ATTENDED,
        TeamWorkspaceMeetingOutcome.NO_SHOW,
        TeamWorkspaceMeetingOutcome.RESCHEDULED,
        TeamWorkspaceMeetingOutcome.CANCELLED,
      ])
      .optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const teamWorkspaceTransitionTaskStatusInputSchema = z
  .object({
    taskId: z.string().uuid(),
    expectedStatus: z.enum(TEAM_WORKSPACE_ACTIVE_TASK_STATUSES),
    expectedVersion: recordVersionSchema,
    nextStatus: z.enum(TEAM_WORKSPACE_ACTIVE_TASK_STATUSES),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const teamWorkspaceUpdateOpportunityStageInputSchema = z
  .object({
    opportunityId: z.string().uuid(),
    expectedStage: z.enum(TEAM_WORKSPACE_NON_CUSTOMER_OPPORTUNITY_STAGES),
    expectedVersion: recordVersionSchema,
    nextStage: z.enum(TEAM_WORKSPACE_NON_CUSTOMER_OPPORTUNITY_STAGES),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const createTeamWorkspaceSnapshotTool = ({
  allowedLanes,
  authContext,
  teamWorkspaceService,
}: {
  allowedLanes: readonly TeamWorkspaceLane[];
  authContext: WorkspaceAuthContext;
  teamWorkspaceService: TeamWorkspaceService;
}) => ({
  description:
    'Read the role-scoped Prospect Engine team workspace snapshot. This projection excludes raw call transcripts and confidential source payloads.',
  inputSchema: teamWorkspaceSnapshotInputSchema,
  execute: async (rawInput: unknown) => {
    const input = teamWorkspaceSnapshotInputSchema.parse(rawInput);

    if (!allowedLanes.includes(input.lane)) {
      throw new Error(
        `The authenticated role cannot read the ${input.lane} lane`,
      );
    }

    if (authContext.type !== 'user') {
      return teamWorkspaceService.getSnapshotForAuthContext({
        lane: input.lane,
        authContext,
      });
    }

    return withWorkspaceAuthContext(authContext, () =>
      teamWorkspaceService.getSnapshot({
        lane: input.lane,
        workspace: authContext.workspace as unknown as WorkspaceEntity,
        userWorkspaceId: authContext.userWorkspaceId,
        workspaceMemberId: authContext.workspaceMemberId,
      }),
    );
  },
});

export const createTeamWorkspaceCompleteTaskTool = ({
  authContext,
  teamWorkspaceCommandService,
}: {
  authContext: WorkspaceAuthContext;
  teamWorkspaceCommandService: TeamWorkspaceCommandService;
}) => ({
  description:
    'Atomically complete an owned team task with auditable evidence. Retry an unknown result with the exact same payload and idempotency key.',
  inputSchema: teamWorkspaceCompleteTaskInputSchema,
  execute: async (rawInput: unknown) => {
    const input = teamWorkspaceCompleteTaskInputSchema.parse(rawInput);

    return teamWorkspaceCommandService.completeTaskWithEvidence(
      authContext,
      input as CompleteTaskWithEvidenceInput,
    );
  },
});

export const createTeamWorkspaceAssignedWorkTool = ({
  authContext,
  teamWorkspaceCommandService,
}: {
  authContext: WorkspaceAuthContext;
  teamWorkspaceCommandService: TeamWorkspaceCommandService;
}) => ({
  description:
    'Atomically assign new work to an exact Sales or Operations member. The server validates the member role and derives the lane-safe task state and work type.',
  inputSchema: teamWorkspaceCreateAssignedWorkInputSchema,
  execute: async (rawInput: unknown) => {
    const input = teamWorkspaceCreateAssignedWorkInputSchema.parse(rawInput);

    return teamWorkspaceCommandService.createAssignedWork(
      authContext,
      input as CreateTeamWorkspaceAssignedWorkInput,
    );
  },
});

export const createTeamWorkspaceWinOpportunityTool = ({
  authContext,
  teamWorkspaceCommandService,
}: {
  authContext: WorkspaceAuthContext;
  teamWorkspaceCommandService: TeamWorkspaceCommandService;
}) => ({
  description:
    'Atomically mark a sales opportunity won and create its Operations handoff. Retry an unknown result with the exact same payload and idempotency key.',
  inputSchema: teamWorkspaceWinOpportunityInputSchema,
  execute: async (rawInput: unknown) => {
    const input = teamWorkspaceWinOpportunityInputSchema.parse(rawInput);

    return teamWorkspaceCommandService.winOpportunityWithHandoff(
      authContext,
      input as WinOpportunityWithHandoffInput,
    );
  },
});

export const createTeamWorkspaceProtocolTaskTool = ({
  authContext,
  teamWorkspaceCommandService,
}: {
  authContext: WorkspaceAuthContext;
  teamWorkspaceCommandService: TeamWorkspaceCommandService;
}) => ({
  description:
    'Create one server-derived Prospect Engine protocol task linked to an existing meeting, recording, client, task, or opportunity. The server derives the title, body, ownership, and client scope.',
  inputSchema: teamWorkspaceCreateProtocolTaskInputSchema,
  execute: async (rawInput: unknown) => {
    const input = teamWorkspaceCreateProtocolTaskInputSchema.parse(rawInput);

    return teamWorkspaceCommandService.createProtocolTask(
      authContext,
      input as CreateTeamWorkspaceProtocolTaskInput,
    );
  },
});

export const createTeamWorkspaceTransitionTaskStatusTool = ({
  authContext,
  teamWorkspaceCommandService,
}: {
  authContext: WorkspaceAuthContext;
  teamWorkspaceCommandService: TeamWorkspaceCommandService;
}) => ({
  description:
    'Atomically transition an owned team task between TODO and IN_PROGRESS using its expected state, version, and an idempotency key.',
  inputSchema: teamWorkspaceTransitionTaskStatusInputSchema,
  execute: async (rawInput: unknown) => {
    const input = teamWorkspaceTransitionTaskStatusInputSchema.parse(rawInput);

    return teamWorkspaceCommandService.transitionTaskStatus(
      authContext,
      input as TransitionTeamWorkspaceTaskInput,
    );
  },
});

export const createTeamWorkspaceUpdateOpportunityStageTool = ({
  authContext,
  teamWorkspaceCommandService,
}: {
  authContext: WorkspaceAuthContext;
  teamWorkspaceCommandService: TeamWorkspaceCommandService;
}) => ({
  description:
    'Atomically transition a Sales opportunity between non-customer pipeline stages using its expected state, version, and an idempotency key. Use team_workspace_win_opportunity for CUSTOMER.',
  inputSchema: teamWorkspaceUpdateOpportunityStageInputSchema,
  execute: async (rawInput: unknown) => {
    const input =
      teamWorkspaceUpdateOpportunityStageInputSchema.parse(rawInput);

    return teamWorkspaceCommandService.updateOpportunityStage(
      authContext,
      input as UpdateTeamWorkspaceOpportunityStageInput,
    );
  },
});
