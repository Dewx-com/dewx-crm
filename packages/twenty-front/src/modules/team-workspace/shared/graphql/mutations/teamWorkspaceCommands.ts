import { gql } from '@apollo/client';

export type TeamWorkspaceCommandReceipt = {
  command: string;
  receiptKey: string;
  targetId: string;
  sideEffectRecordId: string;
  payloadHash: string;
  resultState: string;
  resultVersion: string;
  committedAt: string;
  replayed: boolean;
};

export type TeamWorkspaceCommandLane = 'SALES' | 'OPERATIONS';

export type TeamWorkspaceProtocolTaskKind =
  | 'MEETING_PREP'
  | 'MEETING_OUTCOME'
  | 'COACHING_LESSON'
  | 'CLIENT_UPDATE'
  | 'BLOCKER'
  | 'HANDOFF_RETURN';

export type TeamWorkspaceMeetingOutcome =
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'CANCELLED';

export type CreateProtocolTaskInput = {
  kind: TeamWorkspaceProtocolTaskKind;
  lane: TeamWorkspaceCommandLane;
  targetId: string;
  content: string;
  evidence: string;
  source: string;
  meetingOutcome?: TeamWorkspaceMeetingOutcome;
  idempotencyKey: string;
};

export type TransitionTaskStatusInput = {
  taskId: string;
  expectedStatus: 'TODO' | 'IN_PROGRESS';
  expectedVersion: string;
  nextStatus: 'TODO' | 'IN_PROGRESS';
  idempotencyKey: string;
};

export type UpdateOpportunityStageInput = {
  opportunityId: string;
  expectedStage:
    | 'NEW'
    | 'SCREENING'
    | 'MEETING'
    | 'PROPOSAL'
    | 'DECISION'
    | 'LOST'
    | 'NURTURE'
    | 'DNC';
  expectedVersion: string;
  nextStage:
    | 'NEW'
    | 'SCREENING'
    | 'MEETING'
    | 'PROPOSAL'
    | 'DECISION'
    | 'LOST'
    | 'NURTURE'
    | 'DNC';
  idempotencyKey: string;
};

export type CompleteTaskWithEvidenceInput = {
  taskId: string;
  expectedStatus: 'TODO' | 'IN_PROGRESS';
  expectedVersion: string;
  evidence: string;
  source: string;
  idempotencyKey: string;
};

export type WinOpportunityWithHandoffInput = {
  opportunityId: string;
  expectedStage: string;
  expectedVersion: string;
  company: string;
  contact: string;
  client: string;
  problem: string;
  agreedScope: string;
  promises: string;
  nextCommitment: string;
  evidence: string;
  source: string;
  idempotencyKey: string;
};

const RECEIPT_FIELDS = gql`
  fragment TeamWorkspaceCommandReceiptFields on TeamWorkspaceCommandReceiptDto {
    command
    receiptKey
    targetId
    sideEffectRecordId
    payloadHash
    resultState
    resultVersion
    committedAt
    replayed
  }
`;

export const CREATE_PROTOCOL_TASK = gql`
  ${RECEIPT_FIELDS}
  mutation CreateTeamWorkspaceProtocolTask(
    $input: CreateTeamWorkspaceProtocolTaskInput!
  ) {
    createProtocolTask(input: $input) {
      ...TeamWorkspaceCommandReceiptFields
    }
  }
`;

export const TRANSITION_TASK_STATUS = gql`
  ${RECEIPT_FIELDS}
  mutation TransitionTeamWorkspaceTaskStatus(
    $input: TransitionTeamWorkspaceTaskInput!
  ) {
    transitionTaskStatus(input: $input) {
      ...TeamWorkspaceCommandReceiptFields
    }
  }
`;

export const UPDATE_OPPORTUNITY_STAGE = gql`
  ${RECEIPT_FIELDS}
  mutation UpdateTeamWorkspaceOpportunityStage(
    $input: UpdateTeamWorkspaceOpportunityStageInput!
  ) {
    updateOpportunityStage(input: $input) {
      ...TeamWorkspaceCommandReceiptFields
    }
  }
`;

export const COMPLETE_TASK_WITH_EVIDENCE = gql`
  ${RECEIPT_FIELDS}
  mutation CompleteTeamWorkspaceTask($input: CompleteTaskWithEvidenceInput!) {
    completeTaskWithEvidence(input: $input) {
      ...TeamWorkspaceCommandReceiptFields
    }
  }
`;

export const WIN_OPPORTUNITY_WITH_HANDOFF = gql`
  ${RECEIPT_FIELDS}
  mutation WinTeamWorkspaceOpportunity(
    $input: WinOpportunityWithHandoffInput!
  ) {
    winOpportunityWithHandoff(input: $input) {
      ...TeamWorkspaceCommandReceiptFields
    }
  }
`;
