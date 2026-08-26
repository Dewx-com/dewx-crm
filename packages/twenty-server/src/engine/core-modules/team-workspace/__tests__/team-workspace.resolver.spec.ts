import { withWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';
import { TeamWorkspaceResolver } from 'src/engine/core-modules/team-workspace/team-workspace.resolver';
import { type TeamWorkspaceService } from 'src/engine/core-modules/team-workspace/team-workspace.service';
import { type CompleteTaskWithEvidenceInput } from 'src/modules/team-workspace/commands/dtos/complete-task-with-evidence.input';
import {
  type CreateTeamWorkspaceProtocolTaskInput,
  TeamWorkspaceCommandLane,
  TeamWorkspaceProtocolTaskKind,
} from 'src/modules/team-workspace/commands/dtos/create-team-workspace-protocol-task.input';
import { type TransitionTeamWorkspaceTaskInput } from 'src/modules/team-workspace/commands/dtos/transition-team-workspace-task.input';
import { type UpdateTeamWorkspaceOpportunityStageInput } from 'src/modules/team-workspace/commands/dtos/update-team-workspace-opportunity-stage.input';
import { type WinOpportunityWithHandoffInput } from 'src/modules/team-workspace/commands/dtos/win-opportunity-with-handoff.input';
import { type TeamWorkspaceCommandService } from 'src/modules/team-workspace/commands/team-workspace-command.service';

const snapshot = {
  lane: TeamWorkspaceLane.SALES,
  generatedAt: '2026-08-26T00:00:00.000Z',
  tasks: [],
  handoffs: [],
  opportunities: [],
  clients: [],
  meetings: [],
  callRecordings: [],
};

const userAuthContext = {
  type: 'user',
  workspace: { id: 'workspace-id' },
  userWorkspaceId: 'user-workspace-id',
  workspaceMemberId: 'workspace-member-id',
  workspaceMember: { id: 'workspace-member-id' },
  user: { id: 'user-id' },
} as unknown as WorkspaceAuthContext;

const apiKeyAuthContext = {
  type: 'apiKey',
  workspace: { id: 'workspace-id' },
  apiKey: { id: 'api-key-id' },
} as WorkspaceAuthContext;

const commandReceipt = {
  command: 'completeTaskWithEvidence',
  receiptKey: 'receipt-key',
  targetId: 'b5f78b5b-416b-4d83-81d8-7f0b6d8fd42e',
  sideEffectRecordId: '1df1714e-56a3-4f26-94f2-b899c80ea329',
  payloadHash: 'hash',
  resultState: 'DONE',
  resultVersion: '2026-08-26T00:00:01.000Z',
  committedAt: '2026-08-26T00:00:01.000Z',
  replayed: false,
};

const createHarness = () => {
  const teamWorkspaceService = {
    getSnapshot: jest.fn().mockResolvedValue(snapshot),
    getSnapshotForAuthContext: jest.fn().mockResolvedValue(snapshot),
  };
  const teamWorkspaceCommandService = {
    completeTaskWithEvidence: jest.fn().mockResolvedValue(commandReceipt),
    createProtocolTask: jest.fn().mockResolvedValue(commandReceipt),
    transitionTaskStatus: jest.fn().mockResolvedValue(commandReceipt),
    updateOpportunityStage: jest.fn().mockResolvedValue(commandReceipt),
    winOpportunityWithHandoff: jest.fn().mockResolvedValue(commandReceipt),
  };
  const resolver = new TeamWorkspaceResolver(
    teamWorkspaceService as unknown as TeamWorkspaceService,
    teamWorkspaceCommandService as unknown as TeamWorkspaceCommandService,
  );

  return { resolver, teamWorkspaceCommandService, teamWorkspaceService };
};

describe('TeamWorkspaceResolver', () => {
  it('passes the complete user auth context to the human snapshot boundary', async () => {
    const { resolver, teamWorkspaceService } = createHarness();

    await expect(
      withWorkspaceAuthContext(userAuthContext, () =>
        resolver.teamWorkspaceSnapshot(TeamWorkspaceLane.SALES),
      ),
    ).resolves.toBe(snapshot);
    expect(teamWorkspaceService.getSnapshot).toHaveBeenCalledWith({
      lane: TeamWorkspaceLane.SALES,
      workspace: userAuthContext.workspace,
      userWorkspaceId: 'user-workspace-id',
      workspaceMemberId: 'workspace-member-id',
    });
  });

  it('passes an API key auth context to the safe automation snapshot boundary', async () => {
    const { resolver, teamWorkspaceService } = createHarness();

    await expect(
      withWorkspaceAuthContext(apiKeyAuthContext, () =>
        resolver.teamWorkspaceSnapshot(TeamWorkspaceLane.OPERATIONS),
      ),
    ).resolves.toBe(snapshot);
    expect(teamWorkspaceService.getSnapshotForAuthContext).toHaveBeenCalledWith(
      {
        lane: TeamWorkspaceLane.OPERATIONS,
        authContext: apiKeyAuthContext,
      },
    );
  });

  it('passes the authenticated actor and typed inputs to every atomic command', async () => {
    const { resolver, teamWorkspaceCommandService } = createHarness();
    const completeInput = {
      taskId: 'b5f78b5b-416b-4d83-81d8-7f0b6d8fd42e',
      expectedStatus: 'TODO',
      expectedVersion: '2026-08-26T00:00:00.000Z',
      evidence: 'Reviewed delivery evidence.',
      source: 'CRM update',
      idempotencyKey: 'complete-task-001',
    } satisfies CompleteTaskWithEvidenceInput;
    const winInput = {
      opportunityId: '85dbbc38-479f-4c02-9089-7df23a795178',
      expectedStage: 'DECISION',
      expectedVersion: '2026-08-26T00:00:00.000Z',
      company: 'Example Company',
      contact: 'Example Contact',
      client: 'client-example',
      problem: 'Needs a predictable qualified pipeline.',
      agreedScope: 'Run the agreed outbound campaign.',
      promises: 'Weekly report with verified evidence.',
      nextCommitment: 'Operations kickoff tomorrow.',
      evidence: 'Signed scope in the local client record.',
      source: 'Sales call outcome',
      idempotencyKey: 'win-opportunity-001',
    } satisfies WinOpportunityWithHandoffInput;
    const protocolInput = {
      kind: TeamWorkspaceProtocolTaskKind.MEETING_PREP,
      lane: TeamWorkspaceCommandLane.SALES,
      targetId: '734ba126-5751-49e5-ad81-a3ea254d8884',
      content: 'Review the previous call and prepare the next questions.',
      evidence: 'Linked meeting record.',
      source: 'CRM calendar event',
      idempotencyKey: 'protocol-task-001',
    } satisfies CreateTeamWorkspaceProtocolTaskInput;
    const transitionInput = {
      taskId: '734ba126-5751-49e5-ad81-a3ea254d8884',
      expectedStatus: 'TODO',
      expectedVersion: '2026-08-26T00:00:00.000Z',
      nextStatus: 'IN_PROGRESS',
      idempotencyKey: 'transition-task-001',
    } satisfies TransitionTeamWorkspaceTaskInput;
    const stageInput = {
      opportunityId: '85dbbc38-479f-4c02-9089-7df23a795178',
      expectedStage: 'PROPOSAL',
      expectedVersion: '2026-08-26T00:00:00.000Z',
      nextStage: 'DECISION',
      idempotencyKey: 'opportunity-stage-001',
    } satisfies UpdateTeamWorkspaceOpportunityStageInput;

    await withWorkspaceAuthContext(userAuthContext, async () => {
      await resolver.completeTaskWithEvidence(completeInput);
      await resolver.winOpportunityWithHandoff(winInput);
      await resolver.createProtocolTask(protocolInput);
      await resolver.transitionTaskStatus(transitionInput);
      await resolver.updateOpportunityStage(stageInput);
    });

    expect(
      teamWorkspaceCommandService.completeTaskWithEvidence,
    ).toHaveBeenCalledWith(userAuthContext, completeInput);
    expect(
      teamWorkspaceCommandService.winOpportunityWithHandoff,
    ).toHaveBeenCalledWith(userAuthContext, winInput);
    expect(teamWorkspaceCommandService.createProtocolTask).toHaveBeenCalledWith(
      userAuthContext,
      protocolInput,
    );
    expect(
      teamWorkspaceCommandService.transitionTaskStatus,
    ).toHaveBeenCalledWith(userAuthContext, transitionInput);
    expect(
      teamWorkspaceCommandService.updateOpportunityStage,
    ).toHaveBeenCalledWith(userAuthContext, stageInput);
  });
});
