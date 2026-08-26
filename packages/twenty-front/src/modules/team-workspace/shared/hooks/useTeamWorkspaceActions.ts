import { useMutation } from '@apollo/client/react';

import { type TeamWorkspaceLane } from '@/team-workspace/role/types/TeamWorkspaceLane';
import {
  COMPLETE_TASK_WITH_EVIDENCE,
  CREATE_PROTOCOL_TASK,
  type CompleteTaskWithEvidenceInput,
  type CreateProtocolTaskInput,
  type TeamWorkspaceCommandReceipt,
  TRANSITION_TASK_STATUS,
  type TransitionTaskStatusInput,
  UPDATE_OPPORTUNITY_STAGE,
  type UpdateOpportunityStageInput,
  WIN_OPPORTUNITY_WITH_HANDOFF,
  type WinOpportunityWithHandoffInput,
} from '@/team-workspace/shared/graphql/mutations/teamWorkspaceCommands';
import {
  type TeamCalendarEventRecord,
  type TeamOpportunityRecord,
  type TeamTaskRecord,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';
import { compactText } from '@/team-workspace/shared/utils/teamWorkspaceRecordModel';

const requireText = (label: string, value: string): string => {
  const clean = value.trim();

  if (!compactText(clean)) {
    throw new Error(`${label} is required.`);
  }

  return clean;
};

const requireSingleLine = (label: string, value: string): string =>
  compactText(requireText(label, value));

const requireVersion = (
  label: string,
  value: string | null | undefined,
): string => {
  if (!value || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} changed or has no usable version. Reload first.`);
  }

  return new Date(value).toISOString();
};

const commandLaneOf = (lane: TeamWorkspaceLane) =>
  lane === 'sales' ? ('SALES' as const) : ('OPERATIONS' as const);

const activeTaskStatus = (status: string | null): 'TODO' | 'IN_PROGRESS' => {
  const normalized = status?.toUpperCase();

  if (normalized !== 'TODO' && normalized !== 'IN_PROGRESS') {
    throw new Error('Only to-do or in-progress work can be changed here.');
  }

  return normalized;
};

const nonCustomerStage = (
  stage: string | null,
): UpdateOpportunityStageInput['expectedStage'] => {
  const normalized = stage?.toUpperCase();
  const allowed = [
    'NEW',
    'SCREENING',
    'MEETING',
    'PROPOSAL',
    'DECISION',
    'LOST',
    'NURTURE',
    'DNC',
  ] as const;

  if (!allowed.some((value) => value === normalized)) {
    throw new Error(
      'This opportunity stage cannot be changed from the team workspace.',
    );
  }

  return normalized as UpdateOpportunityStageInput['expectedStage'];
};

const transitionKey = (
  action: string,
  targetId: string,
  version: string,
): string => `team-v1:${action}:${targetId}:${version}`;

const splitCompletionEvidence = (
  value: string,
): { evidence: string; source: string } => {
  const clean = requireText('Completion evidence', value);
  const sourceMatch = clean.match(/(?:^|\n)\s*Source:\s*(.+)\s*$/i);
  const source = requireSingleLine(
    'Completion evidence source',
    sourceMatch?.[1] ?? '',
  );
  const evidence = requireText(
    'What was delivered',
    clean.replace(/(?:^|\n)\s*Source:\s*.+\s*$/i, ''),
  );

  return { evidence, source };
};

export type SalesHandoffInput = {
  opportunity: TeamOpportunityRecord;
  company: string;
  client: string;
  contact: string;
  problem: string;
  agreedScope: string;
  promises: string;
  nextCommitment: string;
  evidence: string;
  source: string;
};

export type MeetingOutcomeKind =
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'CANCELLED';

export const useTeamWorkspaceActions = (lane: TeamWorkspaceLane) => {
  const [runCreateProtocolTask, createProtocolState] = useMutation<
    { createProtocolTask: TeamWorkspaceCommandReceipt },
    { input: CreateProtocolTaskInput }
  >(CREATE_PROTOCOL_TASK);
  const [runTransitionTaskStatus, transitionTaskState] = useMutation<
    { transitionTaskStatus: TeamWorkspaceCommandReceipt },
    { input: TransitionTaskStatusInput }
  >(TRANSITION_TASK_STATUS);
  const [runUpdateOpportunityStage, updateOpportunityState] = useMutation<
    { updateOpportunityStage: TeamWorkspaceCommandReceipt },
    { input: UpdateOpportunityStageInput }
  >(UPDATE_OPPORTUNITY_STAGE);
  const [runCompleteTask, completeTaskState] = useMutation<
    { completeTaskWithEvidence: TeamWorkspaceCommandReceipt },
    { input: CompleteTaskWithEvidenceInput }
  >(COMPLETE_TASK_WITH_EVIDENCE);
  const [runWinOpportunity, winOpportunityState] = useMutation<
    { winOpportunityWithHandoff: TeamWorkspaceCommandReceipt },
    { input: WinOpportunityWithHandoffInput }
  >(WIN_OPPORTUNITY_WITH_HANDOFF);

  const createProtocolTask = (input: CreateProtocolTaskInput) =>
    runCreateProtocolTask({ variables: { input } });

  const prepareMeeting = ({
    meeting,
    notes,
    idempotencyKey,
  }: {
    meeting: TeamCalendarEventRecord;
    notes: string;
    idempotencyKey: string;
  }) => {
    const content = requireText('Preparation notes', notes);

    return createProtocolTask({
      kind: 'MEETING_PREP',
      lane: commandLaneOf(lane),
      targetId: meeting.id,
      content,
      evidence: content,
      source: `Calendar event ${meeting.id}`,
      idempotencyKey,
    });
  };

  const recordMeetingOutcome = ({
    meeting,
    outcomeKind,
    outcome,
    idempotencyKey,
  }: {
    meeting: TeamCalendarEventRecord;
    outcomeKind: MeetingOutcomeKind;
    outcome: string;
    idempotencyKey: string;
  }) => {
    const startsAt = Date.parse(meeting.startsAt ?? '');

    if (!Number.isFinite(startsAt) || startsAt > Date.now()) {
      throw new Error(
        'An outcome can only be recorded after the meeting time.',
      );
    }

    const content = requireText('Meeting outcome', outcome);

    return createProtocolTask({
      kind: 'MEETING_OUTCOME',
      lane: commandLaneOf(lane),
      targetId: meeting.id,
      content,
      evidence: content,
      source: `Calendar event ${meeting.id}`,
      meetingOutcome: outcomeKind,
      idempotencyKey,
    });
  };

  const winOpportunityWithHandoff = (input: SalesHandoffInput) => {
    const expectedVersion = requireVersion(
      'Opportunity',
      input.opportunity.updatedAt,
    );

    return runWinOpportunity({
      variables: {
        input: {
          opportunityId: input.opportunity.id,
          expectedStage: requireSingleLine(
            'Current opportunity stage',
            input.opportunity.stage ?? '',
          ),
          expectedVersion,
          company: requireSingleLine('Company', input.company),
          contact: requireSingleLine('Contact', input.contact),
          client: requireSingleLine('Client scope', input.client),
          problem: requireText('Problem', input.problem),
          agreedScope: requireText('Agreed scope', input.agreedScope),
          promises: requireText('Promises', input.promises),
          nextCommitment: requireText('Next commitment', input.nextCommitment),
          evidence: requireText('Evidence', input.evidence),
          source: requireSingleLine('Agreement source', input.source),
          idempotencyKey: transitionKey(
            'win',
            input.opportunity.id,
            expectedVersion,
          ),
        },
      },
    });
  };

  const appendClientUpdate = ({
    clientId,
    update,
    evidence,
    source,
    idempotencyKey,
  }: {
    clientId: string;
    update: string;
    evidence: string;
    source: string;
    idempotencyKey: string;
  }) =>
    createProtocolTask({
      kind: 'CLIENT_UPDATE',
      lane: 'OPERATIONS',
      targetId: clientId,
      content: requireText('Update', update),
      evidence: requireText('Evidence', evidence),
      source: requireSingleLine('Evidence source', source),
      idempotencyKey,
    });

  const recordCoachingLesson = ({
    recordingId,
    evidenceReference,
    lesson,
    idempotencyKey,
  }: {
    recordingId: string;
    evidenceReference: string | null;
    lesson: string;
    idempotencyKey: string;
  }) => {
    const safeReference = requireSingleLine(
      'Call evidence',
      evidenceReference ?? '',
    );

    return createProtocolTask({
      kind: 'COACHING_LESSON',
      lane: 'SALES',
      targetId: recordingId,
      content: requireText('Improvement', lesson),
      evidence: safeReference,
      source: safeReference,
      idempotencyKey,
    });
  };

  const updateTaskStatus = ({
    task,
    status,
    completionEvidence,
  }: {
    task: TeamTaskRecord;
    status: string;
    completionEvidence?: string;
  }) => {
    const expectedStatus = activeTaskStatus(task.status);
    const expectedVersion = requireVersion('Task', task.updatedAt);
    const normalizedNextStatus = status.toUpperCase();

    if (normalizedNextStatus === 'DONE') {
      const completion = splitCompletionEvidence(completionEvidence ?? '');

      return runCompleteTask({
        variables: {
          input: {
            taskId: task.id,
            expectedStatus,
            expectedVersion,
            ...completion,
            idempotencyKey: transitionKey('complete', task.id, expectedVersion),
          },
        },
      });
    }

    if (
      normalizedNextStatus !== 'TODO' &&
      normalizedNextStatus !== 'IN_PROGRESS'
    ) {
      throw new Error('Unsupported task status.');
    }

    if (normalizedNextStatus === expectedStatus) {
      return Promise.resolve(null);
    }

    return runTransitionTaskStatus({
      variables: {
        input: {
          taskId: task.id,
          expectedStatus,
          expectedVersion,
          nextStatus: normalizedNextStatus,
          idempotencyKey: transitionKey(
            `task-${normalizedNextStatus.toLowerCase()}`,
            task.id,
            expectedVersion,
          ),
        },
      },
    });
  };

  const acceptHandoff = (handoff: TeamTaskRecord) =>
    updateTaskStatus({ task: handoff, status: 'IN_PROGRESS' });

  const returnHandoff = ({
    handoff,
    reason,
    idempotencyKey,
  }: {
    handoff: TeamTaskRecord;
    reason: string;
    idempotencyKey: string;
  }) => {
    const content = requireText('Return reason', reason);

    return createProtocolTask({
      kind: 'HANDOFF_RETURN',
      lane: 'OPERATIONS',
      targetId: handoff.id,
      content,
      evidence: content,
      source: `Handoff ${handoff.id}`,
      idempotencyKey,
    });
  };

  const createBlocker = ({
    task,
    reason,
    idempotencyKey,
  }: {
    task: TeamTaskRecord;
    reason: string;
    idempotencyKey: string;
  }) => {
    const content = requireText('Blocker reason', reason);

    return createProtocolTask({
      kind: 'BLOCKER',
      lane: 'OPERATIONS',
      targetId: task.id,
      content,
      evidence: content,
      source: `Task ${task.id}`,
      idempotencyKey,
    });
  };

  const resolveBlocker = (task: TeamTaskRecord) =>
    updateTaskStatus({
      task,
      status: 'DONE',
      completionEvidence: `Blocker cleared; the original task can continue in progress.\n\nSource: Blocker ${task.id}`,
    });

  const updateOpportunityStage = ({
    opportunity,
    stage,
  }: {
    opportunity: TeamOpportunityRecord;
    stage: string;
  }) => {
    const expectedStage = nonCustomerStage(opportunity.stage);
    const nextStage = nonCustomerStage(stage);
    const expectedVersion = requireVersion(
      'Opportunity',
      opportunity.updatedAt,
    );

    if (nextStage === expectedStage) {
      return Promise.resolve(null);
    }

    return runUpdateOpportunityStage({
      variables: {
        input: {
          opportunityId: opportunity.id,
          expectedStage,
          expectedVersion,
          nextStage,
          idempotencyKey: transitionKey(
            `opportunity-${nextStage.toLowerCase()}`,
            opportunity.id,
            expectedVersion,
          ),
        },
      },
    });
  };

  return {
    creating:
      createProtocolState.loading ||
      transitionTaskState.loading ||
      updateOpportunityState.loading ||
      completeTaskState.loading ||
      winOpportunityState.loading,
    prepareMeeting,
    recordMeetingOutcome,
    winOpportunityWithHandoff,
    appendClientUpdate,
    recordCoachingLesson,
    updateTaskStatus,
    acceptHandoff,
    returnHandoff,
    createBlocker,
    resolveBlocker,
    updateOpportunityStage,
  };
};
