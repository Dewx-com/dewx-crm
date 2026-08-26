import { createHash, timingSafeEqual } from 'node:crypto';

import { type CompleteTaskWithEvidenceInput } from 'src/modules/team-workspace/commands/dtos/complete-task-with-evidence.input';
import { type CreateTeamWorkspaceProtocolTaskInput } from 'src/modules/team-workspace/commands/dtos/create-team-workspace-protocol-task.input';
import { type TransitionTeamWorkspaceTaskInput } from 'src/modules/team-workspace/commands/dtos/transition-team-workspace-task.input';
import { type UpdateTeamWorkspaceOpportunityStageInput } from 'src/modules/team-workspace/commands/dtos/update-team-workspace-opportunity-stage.input';
import { type WinOpportunityWithHandoffInput } from 'src/modules/team-workspace/commands/dtos/win-opportunity-with-handoff.input';

type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const canonicalJson = (value: JsonValue): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
};

export const normalizeTeamWorkspaceCommandText = (value: string): string =>
  value.replace(/\r\n?/g, '\n').trim();

export const completeTaskWithEvidencePayloadMaterial = (
  input: Omit<CompleteTaskWithEvidenceInput, 'idempotencyKey'>,
): JsonValue => ({
  command: 'completeTaskWithEvidence',
  protocolVersion: 1,
  taskId: input.taskId,
  expectedStatus: input.expectedStatus,
  expectedVersion: input.expectedVersion,
  evidence: normalizeTeamWorkspaceCommandText(input.evidence),
  source: normalizeTeamWorkspaceCommandText(input.source),
});

export const winOpportunityWithHandoffPayloadMaterial = (
  input: Omit<WinOpportunityWithHandoffInput, 'idempotencyKey'>,
): JsonValue => ({
  command: 'winOpportunityWithHandoff',
  protocolVersion: 1,
  opportunityId: input.opportunityId,
  expectedStage: normalizeTeamWorkspaceCommandText(input.expectedStage),
  expectedVersion: input.expectedVersion,
  company: normalizeTeamWorkspaceCommandText(input.company),
  contact: normalizeTeamWorkspaceCommandText(input.contact),
  client: normalizeTeamWorkspaceCommandText(input.client),
  problem: normalizeTeamWorkspaceCommandText(input.problem),
  agreedScope: normalizeTeamWorkspaceCommandText(input.agreedScope),
  promises: normalizeTeamWorkspaceCommandText(input.promises),
  nextCommitment: normalizeTeamWorkspaceCommandText(input.nextCommitment),
  evidence: normalizeTeamWorkspaceCommandText(input.evidence),
  source: normalizeTeamWorkspaceCommandText(input.source),
});

export const createTeamWorkspaceProtocolTaskPayloadMaterial = (
  input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>,
): JsonValue => ({
  command: 'createProtocolTask',
  protocolVersion: 1,
  kind: input.kind,
  lane: input.lane,
  targetId: input.targetId,
  content: normalizeTeamWorkspaceCommandText(input.content),
  evidence: normalizeTeamWorkspaceCommandText(input.evidence),
  source: normalizeTeamWorkspaceCommandText(input.source),
  meetingOutcome: input.meetingOutcome ?? null,
});

export const transitionTeamWorkspaceTaskPayloadMaterial = (
  input: Omit<TransitionTeamWorkspaceTaskInput, 'idempotencyKey'>,
): JsonValue => ({
  command: 'transitionTaskStatus',
  protocolVersion: 1,
  taskId: input.taskId,
  expectedStatus: input.expectedStatus,
  expectedVersion: input.expectedVersion,
  nextStatus: input.nextStatus,
});

export const updateTeamWorkspaceOpportunityStagePayloadMaterial = (
  input: Omit<UpdateTeamWorkspaceOpportunityStageInput, 'idempotencyKey'>,
): JsonValue => ({
  command: 'updateOpportunityStage',
  protocolVersion: 1,
  opportunityId: input.opportunityId,
  expectedStage: input.expectedStage,
  expectedVersion: input.expectedVersion,
  nextStage: input.nextStage,
});

const sha256 = (value: JsonValue): string =>
  createHash('sha256').update(canonicalJson(value)).digest('hex');

export const computeCompleteTaskWithEvidencePayloadHash = (
  input: Omit<CompleteTaskWithEvidenceInput, 'idempotencyKey'>,
): string => sha256(completeTaskWithEvidencePayloadMaterial(input));

export const computeWinOpportunityWithHandoffPayloadHash = (
  input: Omit<WinOpportunityWithHandoffInput, 'idempotencyKey'>,
): string => sha256(winOpportunityWithHandoffPayloadMaterial(input));

export const computeCreateTeamWorkspaceProtocolTaskPayloadHash = (
  input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>,
): string => sha256(createTeamWorkspaceProtocolTaskPayloadMaterial(input));

export const computeTransitionTeamWorkspaceTaskPayloadHash = (
  input: Omit<TransitionTeamWorkspaceTaskInput, 'idempotencyKey'>,
): string => sha256(transitionTeamWorkspaceTaskPayloadMaterial(input));

export const computeUpdateTeamWorkspaceOpportunityStagePayloadHash = (
  input: Omit<UpdateTeamWorkspaceOpportunityStageInput, 'idempotencyKey'>,
): string => sha256(updateTeamWorkspaceOpportunityStagePayloadMaterial(input));

export const areSha256HashesEqual = (
  firstHash: string,
  secondHash: string,
): boolean => {
  if (!/^[a-f0-9]{64}$/.test(firstHash) || !/^[a-f0-9]{64}$/.test(secondHash)) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(firstHash, 'hex'),
    Buffer.from(secondHash, 'hex'),
  );
};

export const deterministicCommandUuid = (material: string): string => {
  const digest = createHash('sha256').update(material).digest('hex');
  const variantNibble = (
    (Number.parseInt(digest[16], 16) & 0x3) |
    0x8
  ).toString(16);

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `5${digest.slice(13, 16)}`,
    `${variantNibble}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
};
