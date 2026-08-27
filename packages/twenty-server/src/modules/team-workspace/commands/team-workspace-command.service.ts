import { Injectable } from '@nestjs/common';

import { type ActorMetadata } from 'twenty-shared/types';
import { validateSync } from 'class-validator';

import { buildCreatedByFromApiKey } from 'src/engine/core-modules/actor/utils/build-created-by-from-api-key.util';
import { buildCreatedByFromFullNameMetadata } from 'src/engine/core-modules/actor/utils/build-created-by-from-full-name-metadata.util';
import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import {
  TEAM_WORKSPACE_RECORD_PREFIX,
  TEAM_WORKSPACE_ROLE_LABEL,
} from 'src/engine/core-modules/team-workspace/team-workspace.constants';
import { RoleService } from 'src/engine/metadata-modules/role/role.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { CompleteTaskWithEvidenceInput } from 'src/modules/team-workspace/commands/dtos/complete-task-with-evidence.input';
import { CreateTeamWorkspaceAssignedWorkInput } from 'src/modules/team-workspace/commands/dtos/create-team-workspace-assigned-work.input';
import {
  CreateTeamWorkspaceProtocolTaskInput,
  TeamWorkspaceCommandLane,
  TeamWorkspaceMeetingOutcome,
  TeamWorkspaceProtocolTaskKind,
} from 'src/modules/team-workspace/commands/dtos/create-team-workspace-protocol-task.input';
import { TeamWorkspaceCommandReceiptDto } from 'src/modules/team-workspace/commands/dtos/team-workspace-command-receipt.dto';
import { TransitionTeamWorkspaceTaskInput } from 'src/modules/team-workspace/commands/dtos/transition-team-workspace-task.input';
import { UpdateTeamWorkspaceOpportunityStageInput } from 'src/modules/team-workspace/commands/dtos/update-team-workspace-opportunity-stage.input';
import { WinOpportunityWithHandoffInput } from 'src/modules/team-workspace/commands/dtos/win-opportunity-with-handoff.input';
import {
  TeamWorkspaceCommandException,
  TeamWorkspaceCommandExceptionCode,
} from 'src/modules/team-workspace/commands/exceptions/team-workspace-command.exception';
import { buildMillisecondRecordVersionCondition } from 'src/modules/team-workspace/commands/utils/build-millisecond-record-version-condition.util';
import {
  areSha256HashesEqual,
  computeCompleteTaskWithEvidencePayloadHash,
  computeCreateTeamWorkspaceAssignedWorkPayloadHash,
  computeCreateTeamWorkspaceProtocolTaskPayloadHash,
  computeTransitionTeamWorkspaceTaskPayloadHash,
  computeUpdateTeamWorkspaceOpportunityStagePayloadHash,
  computeWinOpportunityWithHandoffPayloadHash,
  deterministicCommandUuid,
  normalizeTeamWorkspaceCommandText,
} from 'src/modules/team-workspace/commands/utils/team-workspace-command-payload.util';
import { type TaskWorkspaceEntity } from 'src/modules/task/standard-objects/task.workspace-entity';

const TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX = 'prospect-engine:team-command:v1';
const COMMAND_RECEIPT_SCHEMA_VERSION = 1;
const HANDOFF_STATUS = 'TODO';
const COMPLETED_STATUS = 'DONE';
const WON_STAGE = 'CUSTOMER';
const SALES_WORK_TYPE = 'OUTREACH';
const OPERATIONS_WORK_TYPE = 'SOFTWARE';
const TEAM_AUTOMATION_ROLE_LABEL = TEAM_WORKSPACE_ROLE_LABEL.automation;

// A role that works BOTH lanes. Admin and the automation principal already did; Team is the
// human version of that (Roki, 2026-08-27) and, unlike Admin, never reaches Team Management.
// Widening a lane is not widening ownership: isTaskOwnedByPrincipal still gates every write.
const coversBothLanes = (roleLabel: string): boolean =>
  roleLabel === TEAM_WORKSPACE_ROLE_LABEL.admin ||
  roleLabel === TEAM_AUTOMATION_ROLE_LABEL ||
  roleLabel === TEAM_WORKSPACE_ROLE_LABEL.team;

const isHumanLaneRole = (roleLabel: string): boolean =>
  roleLabel === TEAM_WORKSPACE_ROLE_LABEL.sales ||
  roleLabel === TEAM_WORKSPACE_ROLE_LABEL.operations ||
  roleLabel === TEAM_WORKSPACE_ROLE_LABEL.team;

type TeamWorkspaceCommandName =
  | 'completeTaskWithEvidence'
  | 'createAssignedWork'
  | 'winOpportunityWithHandoff'
  | 'createProtocolTask'
  | 'transitionTaskStatus'
  | 'updateOpportunityStage';

type TeamWorkspaceTaskEntity = TaskWorkspaceEntity & {
  client: string | null;
  workType: string | null;
};

type TeamWorkspaceOpportunityEntity = OpportunityWorkspaceEntity & {
  client: string | null;
};

type TeamWorkspaceMeetingParticipantEntity = {
  workspaceMemberId: string | null;
  person: { client: string | null } | null;
};

type TeamWorkspaceMeetingEntity = {
  id: string;
  title: string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  isCanceled: boolean;
  updatedAt: Date | string;
  calendarEventParticipants: TeamWorkspaceMeetingParticipantEntity[];
};

type TeamWorkspaceCallRecordingEntity = {
  id: string;
  title: string | null;
  startedAt: Date | string | null;
  endedAt: Date | string | null;
  transcript: unknown;
  calendarEventId: string | null;
  updatedAt: Date | string;
};

type TeamWorkspaceClientEntity = {
  id: string;
  name: string | null;
  client: string | null;
  updatedAt: Date | string;
};

type ProtocolTaskDerivation = {
  targetVersion: string;
  title: string;
  bodyMarkdown: string;
  client: string;
  dueAt: Date | null;
  status: string;
  workType: string;
  assigneeId: string | null;
};

type TeamWorkspaceCommandPrincipal = {
  principalType: 'apiKey' | 'user';
  principalId: string;
  actor: ActorMetadata;
};

type TeamWorkspaceCommandAuthorization = {
  principal: TeamWorkspaceCommandPrincipal;
  roleLabel:
    | (typeof TEAM_WORKSPACE_ROLE_LABEL)[keyof typeof TEAM_WORKSPACE_ROLE_LABEL]
    | typeof TEAM_AUTOMATION_ROLE_LABEL;
};

type TeamWorkspaceCommandReceipt = {
  schemaVersion: 1;
  command: TeamWorkspaceCommandName;
  workspaceId: string;
  principalType: TeamWorkspaceCommandPrincipal['principalType'];
  principalId: string;
  actor: ActorMetadata;
  idempotencyKey: string;
  payloadHash: string;
  targetId: string;
  expectedState: string;
  expectedVersion: string;
  sideEffectRecordId: string;
  resultState: string;
  resultVersion: string;
  committedAt: string;
};

type ReceiptRow = {
  value: unknown;
};

const commandException = (
  message: string,
  code: TeamWorkspaceCommandExceptionCode,
): never => {
  throw new TeamWorkspaceCommandException(message, code);
};

const nonEmptyText = (value: string): string =>
  normalizeTeamWorkspaceCommandText(value);

const singleLineText = (value: string): string =>
  nonEmptyText(value).replace(/\s+/g, ' ');

const optionalNonBlankText = (value: string | null): string | null => {
  if (value === null || !/\S/.test(value)) {
    return null;
  }

  return value;
};

const titleComponent = (value: string | null, fallback: string): string => {
  const normalized = value === null ? '' : singleLineText(value);

  return (normalized || fallback).slice(0, 180);
};

const timestampDate = (value: Date | string | null, field: string): Date => {
  const date = value instanceof Date ? value : new Date(value ?? '');

  if (Number.isNaN(date.getTime())) {
    return commandException(
      `${field} is missing or invalid`,
      TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
    );
  }

  return date;
};

const meetingOutcomeLabel = (outcome: TeamWorkspaceMeetingOutcome): string =>
  ({
    [TeamWorkspaceMeetingOutcome.ATTENDED]: 'Attended',
    [TeamWorkspaceMeetingOutcome.NO_SHOW]: 'No-show',
    [TeamWorkspaceMeetingOutcome.RESCHEDULED]: 'Rescheduled',
    [TeamWorkspaceMeetingOutcome.CANCELLED]: 'Cancelled',
  })[outcome];

const recordVersion = (value: unknown): string => {
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string'
        ? new Date(value)
        : null;

  if (date !== null && !Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  return commandException(
    'Record has no usable updatedAt version',
    TeamWorkspaceCommandExceptionCode.RECEIPT_INTEGRITY_ERROR,
  );
};

const buildPrincipal = (
  authContext: WorkspaceAuthContext,
): TeamWorkspaceCommandPrincipal => {
  switch (authContext.type) {
    case 'user':
      return {
        principalType: 'user',
        principalId: authContext.workspaceMemberId,
        actor: buildCreatedByFromFullNameMetadata({
          fullNameMetadata: authContext.workspaceMember.name,
          workspaceMemberId: authContext.workspaceMemberId,
        }),
      };
    case 'apiKey':
      return {
        principalType: 'apiKey',
        principalId: authContext.apiKey.id,
        actor: buildCreatedByFromApiKey({ apiKey: authContext.apiKey }),
      };
    case 'application':
    case 'pendingActivationUser':
    case 'system':
      return commandException(
        `Auth context type "${authContext.type}" has no auditable command principal`,
        TeamWorkspaceCommandExceptionCode.UNSUPPORTED_ACTOR,
      );
  }
};

const assertValidInput = <T extends object>(
  inputType: new () => T,
  input: T,
): T => {
  const validatedInput = Object.assign(new inputType(), input);
  const errors = validateSync(validatedInput, {
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    whitelist: true,
  });

  if (errors.length > 0) {
    commandException(
      `Invalid command input: ${errors.map((error) => error.property).join(', ')}`,
      TeamWorkspaceCommandExceptionCode.INVALID_INPUT,
    );
  }

  return validatedInput;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseReceipt = (value: unknown): TeamWorkspaceCommandReceipt => {
  if (
    !isObject(value) ||
    value.schemaVersion !== COMMAND_RECEIPT_SCHEMA_VERSION ||
    ![
      'completeTaskWithEvidence',
      'createAssignedWork',
      'winOpportunityWithHandoff',
      'createProtocolTask',
      'transitionTaskStatus',
      'updateOpportunityStage',
    ].includes(String(value.command)) ||
    (value.principalType !== 'user' && value.principalType !== 'apiKey') ||
    !isObject(value.actor)
  ) {
    return commandException(
      'Stored command receipt has an unknown schema',
      TeamWorkspaceCommandExceptionCode.RECEIPT_INTEGRITY_ERROR,
    );
  }

  const requiredStrings = [
    'workspaceId',
    'principalId',
    'idempotencyKey',
    'payloadHash',
    'targetId',
    'expectedState',
    'expectedVersion',
    'sideEffectRecordId',
    'resultState',
    'resultVersion',
    'committedAt',
  ] as const;

  if (
    requiredStrings.some(
      (key) => typeof value[key] !== 'string' || value[key].length === 0,
    ) ||
    typeof value.actor.source !== 'string' ||
    typeof value.actor.name !== 'string'
  ) {
    return commandException(
      'Stored command receipt is incomplete',
      TeamWorkspaceCommandExceptionCode.RECEIPT_INTEGRITY_ERROR,
    );
  }

  return value as TeamWorkspaceCommandReceipt;
};

const receiptKeyFor = (
  command: TeamWorkspaceCommandName,
  idempotencyKey: string,
): string =>
  `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:${command}:${idempotencyKey}`;

const assertReplayMatches = ({
  receipt,
  command,
  workspaceId,
  principal,
  idempotencyKey,
  payloadHash,
  targetId,
}: {
  receipt: TeamWorkspaceCommandReceipt;
  command: TeamWorkspaceCommandName;
  workspaceId: string;
  principal: TeamWorkspaceCommandPrincipal;
  idempotencyKey: string;
  payloadHash: string;
  targetId: string;
}): void => {
  const exactContextMatch =
    receipt.command === command &&
    receipt.workspaceId === workspaceId &&
    receipt.principalType === principal.principalType &&
    receipt.principalId === principal.principalId &&
    receipt.idempotencyKey === idempotencyKey &&
    receipt.targetId === targetId;

  if (
    !exactContextMatch ||
    !areSha256HashesEqual(receipt.payloadHash, payloadHash)
  ) {
    commandException(
      'Idempotency key is already bound to another actor, target, or payload',
      TeamWorkspaceCommandExceptionCode.IDEMPOTENCY_CONFLICT,
    );
  }
};

const toReceiptDto = (
  receipt: TeamWorkspaceCommandReceipt,
  replayed: boolean,
): TeamWorkspaceCommandReceiptDto => ({
  command: receipt.command,
  receiptKey: receiptKeyFor(receipt.command, receipt.idempotencyKey),
  targetId: receipt.targetId,
  sideEffectRecordId: receipt.sideEffectRecordId,
  payloadHash: receipt.payloadHash,
  resultState: receipt.resultState,
  resultVersion: receipt.resultVersion,
  committedAt: receipt.committedAt,
  replayed,
});

const receiptAuditComment = (
  receipt: Omit<TeamWorkspaceCommandReceipt, 'resultState' | 'resultVersion'>,
): string => {
  const encodedReceipt = Buffer.from(JSON.stringify(receipt)).toString(
    'base64url',
  );

  return `<!-- pe-team-command-receipt-v1:${encodedReceipt} -->`;
};

@Injectable()
export class TeamWorkspaceCommandService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    private readonly userRoleService: UserRoleService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
    private readonly roleService: RoleService,
  ) {}

  async completeTaskWithEvidence(
    authContext: WorkspaceAuthContext,
    rawInput: CompleteTaskWithEvidenceInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    this.assertWorkspaceIsEnabled(authContext.workspace.id);
    const authorization = await this.authorizeCommand(
      authContext,
      'completeTaskWithEvidence',
    );
    const input = assertValidInput(CompleteTaskWithEvidenceInput, rawInput);
    const { idempotencyKey, evidence, source, ...payloadInput } = input;
    const normalizedInput = {
      ...payloadInput,
      evidence: nonEmptyText(evidence),
      source: singleLineText(source),
    };
    const payloadHash =
      computeCompleteTaskWithEvidencePayloadHash(normalizedInput);

    const workspaceId = authContext.workspace.id;
    const { principal } = authorization;

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          async (transactionScope) => {
            const taskRepository =
              transactionScope.getRepository<TeamWorkspaceTaskEntity>('task', {
                shouldBypassPermissionChecks: true,
              });
            const command = 'completeTaskWithEvidence' as const;
            const receiptKey = receiptKeyFor(command, idempotencyKey);

            await this.acquireCommandLocks(transactionScope, [
              `${receiptKey}:${workspaceId}`,
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:target:${workspaceId}:task:${input.taskId}`,
            ]);

            const replay = await this.readReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
            );

            if (replay !== null) {
              assertReplayMatches({
                receipt: replay,
                command,
                workspaceId,
                principal,
                idempotencyKey,
                payloadHash,
                targetId: input.taskId,
              });
              const replayedTask = await this.readReplayTarget(
                taskRepository,
                input.taskId,
              );
              this.assertCanCompleteTask(replayedTask, authorization);

              return toReceiptDto(replay, true);
            }

            const task = await taskRepository.findOne({
              where: { id: input.taskId },
            });

            if (task === null) {
              return commandException(
                `Task ${input.taskId} was not found or is forbidden`,
                TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
              );
            }

            this.assertCanCompleteTask(task, authorization);

            if (task.status !== input.expectedStatus) {
              commandException(
                `Expected task status ${input.expectedStatus}, found ${task.status ?? 'null'}`,
                TeamWorkspaceCommandExceptionCode.EXPECTED_STATE_CONFLICT,
              );
            }

            const currentVersion = recordVersion(task.updatedAt);

            if (currentVersion !== input.expectedVersion) {
              commandException(
                `Expected task version ${input.expectedVersion}, found ${currentVersion}`,
                TeamWorkspaceCommandExceptionCode.EXPECTED_VERSION_CONFLICT,
              );
            }

            const evidenceRecordId = deterministicCommandUuid(
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:evidence:${workspaceId}:${input.taskId}`,
            );
            const existingEvidence = await taskRepository.findOne({
              where: { id: evidenceRecordId },
            });

            if (existingEvidence !== null) {
              commandException(
                `Completion evidence ${evidenceRecordId} already exists without this receipt`,
                TeamWorkspaceCommandExceptionCode.SIDE_EFFECT_CONFLICT,
              );
            }

            const committedAt = new Date().toISOString();
            const audit = {
              schemaVersion: COMMAND_RECEIPT_SCHEMA_VERSION,
              command,
              workspaceId,
              principalType: principal.principalType,
              principalId: principal.principalId,
              actor: principal.actor,
              idempotencyKey,
              payloadHash,
              targetId: input.taskId,
              expectedState: input.expectedStatus,
              expectedVersion: input.expectedVersion,
              sideEffectRecordId: evidenceRecordId,
              committedAt,
            } satisfies Omit<
              TeamWorkspaceCommandReceipt,
              'resultState' | 'resultVersion'
            >;

            await taskRepository.insert({
              id: evidenceRecordId,
              title: `Completion evidence · ${input.taskId}`,
              bodyV2: {
                blocknote: null,
                markdown: `${receiptAuditComment(audit)}\n\n**Completion evidence:** ${normalizedInput.evidence}\n\nSource: ${normalizedInput.source}`,
              },
              client: task.client,
              status: COMPLETED_STATUS,
              workType: task.workType ?? SALES_WORK_TYPE,
              createdBy: principal.actor,
              updatedBy: principal.actor,
            });

            const updateResult = await taskRepository.update(
              {
                id: input.taskId,
                status: input.expectedStatus,
                updatedAt: buildMillisecondRecordVersionCondition(
                  recordVersion(task.updatedAt),
                ),
              },
              {
                status: COMPLETED_STATUS,
                updatedBy: principal.actor,
              },
            );

            if (updateResult.affected !== 1) {
              commandException(
                `Task ${input.taskId} changed during completion`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const completedTask = await taskRepository.findOne({
              where: { id: input.taskId },
            });

            if (completedTask?.status !== COMPLETED_STATUS) {
              return commandException(
                `Task ${input.taskId} did not read back as complete`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const receipt: TeamWorkspaceCommandReceipt = {
              ...audit,
              resultState: COMPLETED_STATUS,
              resultVersion: recordVersion(completedTask.updatedAt),
            };

            await this.insertReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
              receipt,
            );

            return toReceiptDto(receipt, false);
          },
        ),
      authContext,
    );
  }

  async createAssignedWork(
    authContext: WorkspaceAuthContext,
    rawInput: CreateTeamWorkspaceAssignedWorkInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    this.assertWorkspaceIsEnabled(authContext.workspace.id);
    const authorization = await this.authorizeCommand(
      authContext,
      'createAssignedWork',
    );
    const input = assertValidInput(
      CreateTeamWorkspaceAssignedWorkInput,
      rawInput,
    );
    const { idempotencyKey, title, detail, dueAt, client, ...payloadInput } =
      input;
    const normalizedClient = optionalNonBlankText(client ?? null);
    const normalizedInput = {
      ...payloadInput,
      title: singleLineText(title),
      detail: nonEmptyText(detail),
      dueAt: timestampDate(dueAt, 'Assigned work dueAt').toISOString(),
      client:
        normalizedClient === null ? null : singleLineText(normalizedClient),
    };
    const payloadHash =
      computeCreateTeamWorkspaceAssignedWorkPayloadHash(normalizedInput);
    const workspaceId = authContext.workspace.id;
    const { principal } = authorization;

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          async (transactionScope) => {
            const command = 'createAssignedWork' as const;
            const receiptKey = receiptKeyFor(command, idempotencyKey);

            await this.acquireCommandLocks(transactionScope, [
              `${receiptKey}:${workspaceId}`,
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:target:${workspaceId}:workspaceMember:${input.assigneeId}`,
            ]);

            const replay = await this.readReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
            );
            const taskRepository =
              transactionScope.getRepository<TeamWorkspaceTaskEntity>('task', {
                shouldBypassPermissionChecks: true,
              });

            if (replay !== null) {
              assertReplayMatches({
                receipt: replay,
                command,
                workspaceId,
                principal,
                idempotencyKey,
                payloadHash,
                targetId: input.assigneeId,
              });
              await this.readReplayTarget(
                taskRepository,
                replay.sideEffectRecordId,
              );

              return toReceiptDto(replay, true);
            }

            const assigneeRoleId = await this.assertAssigneeHasExactLaneRole({
              workspaceId,
              assigneeId: normalizedInput.assigneeId,
              lane: normalizedInput.lane,
            });
            const clientScope = await this.resolveOptionalClientScope({
              transactionScope,
              submittedClient: normalizedInput.client,
            });
            const taskId = deterministicCommandUuid(
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:assigned-work:${workspaceId}:${normalizedInput.assigneeId}:${idempotencyKey}`,
            );
            const existingTask = await taskRepository.findOne({
              where: { id: taskId },
            });

            if (existingTask !== null) {
              commandException(
                `Assigned work ${taskId} already exists without this receipt`,
                TeamWorkspaceCommandExceptionCode.SIDE_EFFECT_CONFLICT,
              );
            }

            const committedAt = new Date().toISOString();
            const workType = this.workTypeForLane(normalizedInput.lane);
            const audit = {
              schemaVersion: COMMAND_RECEIPT_SCHEMA_VERSION,
              command,
              workspaceId,
              principalType: principal.principalType,
              principalId: principal.principalId,
              actor: principal.actor,
              idempotencyKey,
              payloadHash,
              targetId: normalizedInput.assigneeId,
              expectedState: `ASSIGNEE_ROLE:${normalizedInput.lane}`,
              expectedVersion: assigneeRoleId,
              sideEffectRecordId: taskId,
              committedAt,
            } satisfies Omit<
              TeamWorkspaceCommandReceipt,
              'resultState' | 'resultVersion'
            >;

            await taskRepository.insert({
              id: taskId,
              title: normalizedInput.title,
              bodyV2: {
                blocknote: null,
                markdown: `${receiptAuditComment(audit)}\n\n**Assignment:** ${normalizedInput.detail}`,
              },
              client: clientScope,
              dueAt: new Date(normalizedInput.dueAt),
              status: 'TODO',
              workType,
              assigneeId: normalizedInput.assigneeId,
              createdBy: principal.actor,
              updatedBy: principal.actor,
            });

            const createdTask = await taskRepository.findOne({
              where: { id: taskId },
            });

            if (
              createdTask === null ||
              createdTask.status !== 'TODO' ||
              createdTask.workType !== workType ||
              createdTask.assigneeId !== normalizedInput.assigneeId ||
              createdTask.client !== clientScope
            ) {
              return commandException(
                `Assigned work ${taskId} did not read back after insert`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const receipt: TeamWorkspaceCommandReceipt = {
              ...audit,
              resultState: 'TODO',
              resultVersion: recordVersion(createdTask.updatedAt),
            };

            await this.insertReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
              receipt,
            );

            return toReceiptDto(receipt, false);
          },
        ),
      authContext,
    );
  }

  async winOpportunityWithHandoff(
    authContext: WorkspaceAuthContext,
    rawInput: WinOpportunityWithHandoffInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    this.assertWorkspaceIsEnabled(authContext.workspace.id);
    const authorization = await this.authorizeCommand(
      authContext,
      'winOpportunityWithHandoff',
    );
    const input = assertValidInput(WinOpportunityWithHandoffInput, rawInput);
    const {
      idempotencyKey,
      expectedStage,
      company,
      contact,
      client,
      problem,
      agreedScope,
      promises,
      nextCommitment,
      evidence,
      source,
      ...payloadInput
    } = input;
    const normalizedInput = {
      ...payloadInput,
      expectedStage: singleLineText(expectedStage),
      company: singleLineText(company),
      contact: singleLineText(contact),
      client: singleLineText(client),
      problem: nonEmptyText(problem),
      agreedScope: nonEmptyText(agreedScope),
      promises: nonEmptyText(promises),
      nextCommitment: nonEmptyText(nextCommitment),
      evidence: nonEmptyText(evidence),
      source: singleLineText(source),
    };
    const payloadHash =
      computeWinOpportunityWithHandoffPayloadHash(normalizedInput);

    const workspaceId = authContext.workspace.id;
    const { principal } = authorization;

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          async (transactionScope) => {
            const opportunityRepository =
              transactionScope.getRepository<TeamWorkspaceOpportunityEntity>(
                'opportunity',
                { shouldBypassPermissionChecks: true },
              );
            const taskRepository =
              transactionScope.getRepository<TeamWorkspaceTaskEntity>('task', {
                shouldBypassPermissionChecks: true,
              });
            const command = 'winOpportunityWithHandoff' as const;
            const receiptKey = receiptKeyFor(command, idempotencyKey);

            await this.acquireCommandLocks(transactionScope, [
              `${receiptKey}:${workspaceId}`,
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:target:${workspaceId}:opportunity:${input.opportunityId}`,
            ]);

            const replay = await this.readReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
            );

            if (replay !== null) {
              assertReplayMatches({
                receipt: replay,
                command,
                workspaceId,
                principal,
                idempotencyKey,
                payloadHash,
                targetId: input.opportunityId,
              });
              const replayedOpportunity = await this.readReplayTarget(
                opportunityRepository,
                input.opportunityId,
              );
              this.assertCanWinOpportunity(replayedOpportunity, authorization);

              return toReceiptDto(replay, true);
            }

            const opportunity = await opportunityRepository.findOne({
              where: { id: input.opportunityId },
            });

            if (opportunity === null) {
              return commandException(
                `Opportunity ${input.opportunityId} was not found or is forbidden`,
                TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
              );
            }

            this.assertCanWinOpportunity(opportunity, authorization);

            if (opportunity.stage !== normalizedInput.expectedStage) {
              commandException(
                `Expected opportunity stage ${normalizedInput.expectedStage}, found ${opportunity.stage}`,
                TeamWorkspaceCommandExceptionCode.EXPECTED_STATE_CONFLICT,
              );
            }

            const currentVersion = recordVersion(opportunity.updatedAt);

            if (currentVersion !== input.expectedVersion) {
              commandException(
                `Expected opportunity version ${input.expectedVersion}, found ${currentVersion}`,
                TeamWorkspaceCommandExceptionCode.EXPECTED_VERSION_CONFLICT,
              );
            }

            const resolvedClient = await this.resolveHandoffClientScope({
              transactionScope,
              opportunity,
              submittedClient: normalizedInput.client,
            });

            const handoffRecordId = input.opportunityId;
            const existingHandoff = await taskRepository.findOne({
              where: { id: handoffRecordId },
            });

            if (existingHandoff !== null) {
              commandException(
                `Handoff ${handoffRecordId} already exists without this receipt`,
                TeamWorkspaceCommandExceptionCode.SIDE_EFFECT_CONFLICT,
              );
            }

            const committedAt = new Date().toISOString();
            const audit = {
              schemaVersion: COMMAND_RECEIPT_SCHEMA_VERSION,
              command,
              workspaceId,
              principalType: principal.principalType,
              principalId: principal.principalId,
              actor: principal.actor,
              idempotencyKey,
              payloadHash,
              targetId: input.opportunityId,
              expectedState: normalizedInput.expectedStage,
              expectedVersion: input.expectedVersion,
              sideEffectRecordId: handoffRecordId,
              committedAt,
            } satisfies Omit<
              TeamWorkspaceCommandReceipt,
              'resultState' | 'resultVersion'
            >;

            await taskRepository.insert({
              id: handoffRecordId,
              title: `Handoff · ${input.opportunityId} · ${normalizedInput.company}`,
              bodyV2: {
                blocknote: null,
                markdown: [
                  receiptAuditComment(audit),
                  `**Contact:** ${normalizedInput.contact}`,
                  `**Problem:** ${normalizedInput.problem}`,
                  `**Agreed scope:** ${normalizedInput.agreedScope}`,
                  `**Promises:** ${normalizedInput.promises}`,
                  `**Next commitment:** ${normalizedInput.nextCommitment}`,
                  `**Evidence:** ${normalizedInput.evidence}`,
                  `**Source:** ${normalizedInput.source}`,
                ].join('\n\n'),
              },
              client: resolvedClient.scope,
              status: HANDOFF_STATUS,
              workType: SALES_WORK_TYPE,
              createdBy: principal.actor,
              updatedBy: principal.actor,
            });

            const updateResult = await opportunityRepository.update(
              {
                id: input.opportunityId,
                stage: normalizedInput.expectedStage,
                updatedAt: buildMillisecondRecordVersionCondition(
                  recordVersion(opportunity.updatedAt),
                ),
              },
              {
                stage: WON_STAGE,
                ...(resolvedClient.shouldBackfill
                  ? { client: resolvedClient.scope }
                  : {}),
                updatedBy: principal.actor,
              },
            );

            if (updateResult.affected !== 1) {
              commandException(
                `Opportunity ${input.opportunityId} changed during handoff`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const wonOpportunity = await opportunityRepository.findOne({
              where: { id: input.opportunityId },
            });

            if (
              wonOpportunity?.stage !== WON_STAGE ||
              optionalNonBlankText(wonOpportunity.client) !==
                resolvedClient.scope
            ) {
              return commandException(
                `Opportunity ${input.opportunityId} did not read back as won with client ${resolvedClient.scope}`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const receipt: TeamWorkspaceCommandReceipt = {
              ...audit,
              resultState: WON_STAGE,
              resultVersion: recordVersion(wonOpportunity.updatedAt),
            };

            await this.insertReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
              receipt,
            );

            return toReceiptDto(receipt, false);
          },
        ),
      authContext,
    );
  }

  async createProtocolTask(
    authContext: WorkspaceAuthContext,
    rawInput: CreateTeamWorkspaceProtocolTaskInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    this.assertWorkspaceIsEnabled(authContext.workspace.id);
    const authorization = await this.authorizeCommand(
      authContext,
      'createProtocolTask',
    );
    const input = assertValidInput(
      CreateTeamWorkspaceProtocolTaskInput,
      rawInput,
    );
    const { idempotencyKey, content, evidence, source, ...payloadInput } =
      input;
    const normalizedInput = {
      ...payloadInput,
      content: nonEmptyText(content),
      evidence: nonEmptyText(evidence),
      source: singleLineText(source),
    };

    this.assertProtocolLaneAndOutcome(normalizedInput, authorization);

    const payloadHash =
      computeCreateTeamWorkspaceProtocolTaskPayloadHash(normalizedInput);
    const workspaceId = authContext.workspace.id;
    const { principal } = authorization;

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          async (transactionScope) => {
            const command = 'createProtocolTask' as const;
            const receiptKey = receiptKeyFor(command, idempotencyKey);
            const targetObjectName = this.protocolTargetObjectName(input.kind);

            await this.acquireCommandLocks(transactionScope, [
              `${receiptKey}:${workspaceId}`,
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:target:${workspaceId}:${targetObjectName}:${input.targetId}`,
            ]);

            const replay = await this.readReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
            );

            if (replay !== null) {
              assertReplayMatches({
                receipt: replay,
                command,
                workspaceId,
                principal,
                idempotencyKey,
                payloadHash,
                targetId: input.targetId,
              });
              const taskRepository =
                transactionScope.getRepository<TeamWorkspaceTaskEntity>(
                  'task',
                  { shouldBypassPermissionChecks: true },
                );

              await this.readReplayTarget(
                taskRepository,
                replay.sideEffectRecordId,
              );

              return toReceiptDto(replay, true);
            }

            const derivation = await this.deriveProtocolTask({
              transactionScope,
              input: normalizedInput,
              authorization,
            });
            const taskRepository =
              transactionScope.getRepository<TeamWorkspaceTaskEntity>('task', {
                shouldBypassPermissionChecks: true,
              });
            const protocolTaskId = deterministicCommandUuid(
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:protocol-task:${workspaceId}:${input.kind}:${input.targetId}:${idempotencyKey}`,
            );
            const existingTask = await taskRepository.findOne({
              where: { id: protocolTaskId },
            });

            if (existingTask !== null) {
              commandException(
                `Protocol task ${protocolTaskId} already exists without this receipt`,
                TeamWorkspaceCommandExceptionCode.SIDE_EFFECT_CONFLICT,
              );
            }

            const committedAt = new Date().toISOString();
            const audit = {
              schemaVersion: COMMAND_RECEIPT_SCHEMA_VERSION,
              command,
              workspaceId,
              principalType: principal.principalType,
              principalId: principal.principalId,
              actor: principal.actor,
              idempotencyKey,
              payloadHash,
              targetId: input.targetId,
              expectedState: `PROTOCOL:${input.kind}:${input.lane}`,
              expectedVersion: derivation.targetVersion,
              sideEffectRecordId: protocolTaskId,
              committedAt,
            } satisfies Omit<
              TeamWorkspaceCommandReceipt,
              'resultState' | 'resultVersion'
            >;

            await taskRepository.insert({
              id: protocolTaskId,
              title: derivation.title,
              bodyV2: {
                blocknote: null,
                markdown: `${receiptAuditComment(audit)}\n\n${derivation.bodyMarkdown}`,
              },
              client: derivation.client,
              dueAt: derivation.dueAt,
              status: derivation.status,
              workType: derivation.workType,
              assigneeId: derivation.assigneeId,
              createdBy: principal.actor,
              updatedBy: principal.actor,
            });

            const createdTask = await taskRepository.findOne({
              where: { id: protocolTaskId },
            });

            if (
              createdTask === null ||
              createdTask.status !== derivation.status
            ) {
              return commandException(
                `Protocol task ${protocolTaskId} did not read back after insert`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const receipt: TeamWorkspaceCommandReceipt = {
              ...audit,
              resultState: derivation.status,
              resultVersion: recordVersion(createdTask.updatedAt),
            };

            await this.insertReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
              receipt,
            );

            return toReceiptDto(receipt, false);
          },
        ),
      authContext,
    );
  }

  async transitionTaskStatus(
    authContext: WorkspaceAuthContext,
    rawInput: TransitionTeamWorkspaceTaskInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    this.assertWorkspaceIsEnabled(authContext.workspace.id);
    const authorization = await this.authorizeCommand(
      authContext,
      'transitionTaskStatus',
    );
    const input = assertValidInput(TransitionTeamWorkspaceTaskInput, rawInput);

    if (input.expectedStatus === input.nextStatus) {
      commandException(
        'Task transition must change status',
        TeamWorkspaceCommandExceptionCode.INVALID_TRANSITION,
      );
    }

    const { idempotencyKey, ...payloadInput } = input;
    const payloadHash =
      computeTransitionTeamWorkspaceTaskPayloadHash(payloadInput);
    const workspaceId = authContext.workspace.id;
    const { principal } = authorization;

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          async (transactionScope) => {
            const taskRepository =
              transactionScope.getRepository<TeamWorkspaceTaskEntity>('task', {
                shouldBypassPermissionChecks: true,
              });
            const command = 'transitionTaskStatus' as const;
            const receiptKey = receiptKeyFor(command, idempotencyKey);

            await this.acquireCommandLocks(transactionScope, [
              `${receiptKey}:${workspaceId}`,
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:target:${workspaceId}:task:${input.taskId}`,
            ]);

            const replay = await this.readReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
            );

            if (replay !== null) {
              assertReplayMatches({
                receipt: replay,
                command,
                workspaceId,
                principal,
                idempotencyKey,
                payloadHash,
                targetId: input.taskId,
              });
              const replayedTask = await this.readReplayTarget(
                taskRepository,
                input.taskId,
              );

              this.assertCanTransitionTask(replayedTask, authorization);

              return toReceiptDto(replay, true);
            }

            const task = await taskRepository.findOne({
              where: { id: input.taskId },
            });

            if (task === null) {
              return commandException(
                `Task ${input.taskId} was not found or is forbidden`,
                TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
              );
            }

            this.assertCanTransitionTask(task, authorization);
            this.assertExpectedStateAndVersion({
              recordName: 'Task',
              recordId: task.id,
              actualState: task.status,
              expectedState: input.expectedStatus,
              actualVersion: task.updatedAt,
              expectedVersion: input.expectedVersion,
            });

            const updateResult = await taskRepository.update(
              {
                id: input.taskId,
                status: input.expectedStatus,
                updatedAt: buildMillisecondRecordVersionCondition(
                  recordVersion(task.updatedAt),
                ),
              },
              {
                status: input.nextStatus,
                updatedBy: principal.actor,
              },
            );

            if (updateResult.affected !== 1) {
              commandException(
                `Task ${input.taskId} changed during transition`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const transitionedTask = await taskRepository.findOne({
              where: { id: input.taskId },
            });

            if (transitionedTask?.status !== input.nextStatus) {
              return commandException(
                `Task ${input.taskId} did not read back at ${input.nextStatus}`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const receipt: TeamWorkspaceCommandReceipt = {
              schemaVersion: COMMAND_RECEIPT_SCHEMA_VERSION,
              command,
              workspaceId,
              principalType: principal.principalType,
              principalId: principal.principalId,
              actor: principal.actor,
              idempotencyKey,
              payloadHash,
              targetId: input.taskId,
              expectedState: input.expectedStatus,
              expectedVersion: input.expectedVersion,
              sideEffectRecordId: input.taskId,
              resultState: input.nextStatus,
              resultVersion: recordVersion(transitionedTask.updatedAt),
              committedAt: new Date().toISOString(),
            };

            await this.insertReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
              receipt,
            );

            return toReceiptDto(receipt, false);
          },
        ),
      authContext,
    );
  }

  async updateOpportunityStage(
    authContext: WorkspaceAuthContext,
    rawInput: UpdateTeamWorkspaceOpportunityStageInput,
  ): Promise<TeamWorkspaceCommandReceiptDto> {
    this.assertWorkspaceIsEnabled(authContext.workspace.id);
    const authorization = await this.authorizeCommand(
      authContext,
      'updateOpportunityStage',
    );
    const input = assertValidInput(
      UpdateTeamWorkspaceOpportunityStageInput,
      rawInput,
    );

    if (input.expectedStage === input.nextStage) {
      commandException(
        'Opportunity transition must change stage',
        TeamWorkspaceCommandExceptionCode.INVALID_TRANSITION,
      );
    }

    const { idempotencyKey, ...payloadInput } = input;
    const payloadHash =
      computeUpdateTeamWorkspaceOpportunityStagePayloadHash(payloadInput);
    const workspaceId = authContext.workspace.id;
    const { principal } = authorization;

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          async (transactionScope) => {
            const opportunityRepository =
              transactionScope.getRepository<TeamWorkspaceOpportunityEntity>(
                'opportunity',
                { shouldBypassPermissionChecks: true },
              );
            const command = 'updateOpportunityStage' as const;
            const receiptKey = receiptKeyFor(command, idempotencyKey);

            await this.acquireCommandLocks(transactionScope, [
              `${receiptKey}:${workspaceId}`,
              `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:target:${workspaceId}:opportunity:${input.opportunityId}`,
            ]);

            const replay = await this.readReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
            );

            if (replay !== null) {
              assertReplayMatches({
                receipt: replay,
                command,
                workspaceId,
                principal,
                idempotencyKey,
                payloadHash,
                targetId: input.opportunityId,
              });
              const replayedOpportunity = await this.readReplayTarget(
                opportunityRepository,
                input.opportunityId,
              );

              this.assertCanWinOpportunity(replayedOpportunity, authorization);

              return toReceiptDto(replay, true);
            }

            const opportunity = await opportunityRepository.findOne({
              where: { id: input.opportunityId },
            });

            if (opportunity === null) {
              return commandException(
                `Opportunity ${input.opportunityId} was not found or is forbidden`,
                TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
              );
            }

            this.assertCanWinOpportunity(opportunity, authorization);
            this.assertExpectedStateAndVersion({
              recordName: 'Opportunity',
              recordId: opportunity.id,
              actualState: opportunity.stage,
              expectedState: input.expectedStage,
              actualVersion: opportunity.updatedAt,
              expectedVersion: input.expectedVersion,
            });

            const updateResult = await opportunityRepository.update(
              {
                id: input.opportunityId,
                stage: input.expectedStage,
                updatedAt: buildMillisecondRecordVersionCondition(
                  recordVersion(opportunity.updatedAt),
                ),
              },
              {
                stage: input.nextStage,
                updatedBy: principal.actor,
              },
            );

            if (updateResult.affected !== 1) {
              commandException(
                `Opportunity ${input.opportunityId} changed during transition`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const updatedOpportunity = await opportunityRepository.findOne({
              where: { id: input.opportunityId },
            });

            if (updatedOpportunity?.stage !== input.nextStage) {
              return commandException(
                `Opportunity ${input.opportunityId} did not read back at ${input.nextStage}`,
                TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
              );
            }

            const receipt: TeamWorkspaceCommandReceipt = {
              schemaVersion: COMMAND_RECEIPT_SCHEMA_VERSION,
              command,
              workspaceId,
              principalType: principal.principalType,
              principalId: principal.principalId,
              actor: principal.actor,
              idempotencyKey,
              payloadHash,
              targetId: input.opportunityId,
              expectedState: input.expectedStage,
              expectedVersion: input.expectedVersion,
              sideEffectRecordId: input.opportunityId,
              resultState: input.nextStage,
              resultVersion: recordVersion(updatedOpportunity.updatedAt),
              committedAt: new Date().toISOString(),
            };

            await this.insertReceipt(
              transactionScope,
              workspaceId,
              receiptKey,
              receipt,
            );

            return toReceiptDto(receipt, false);
          },
        ),
      authContext,
    );
  }

  private async assertAssigneeHasExactLaneRole({
    workspaceId,
    assigneeId,
    lane,
  }: {
    workspaceId: string;
    assigneeId: string;
    lane: TeamWorkspaceCommandLane;
  }): Promise<string> {
    const roles = await this.roleService.getWorkspaceRoles(workspaceId);
    const rolesForAssignee = (
      await Promise.all(
        roles.map(async (role) => ({
          role,
          members: await this.userRoleService.getWorkspaceMembersAssignedToRole(
            role.id,
            workspaceId,
          ),
        })),
      )
    )
      .filter(({ members }) =>
        members.some((member) => member.id === assigneeId),
      )
      .map(({ role }) => role);
    const expectedRoleLabel =
      lane === TeamWorkspaceCommandLane.SALES
        ? TEAM_WORKSPACE_ROLE_LABEL.sales
        : TEAM_WORKSPACE_ROLE_LABEL.operations;
    // Work in either lane may be assigned to someone on the Team role, who works both.
    // Still exactly ONE role: Team INSTEAD of the lane role, never alongside it.
    const acceptedRoleLabels = new Set<string>([
      expectedRoleLabel,
      TEAM_WORKSPACE_ROLE_LABEL.team,
    ]);

    if (
      rolesForAssignee.length !== 1 ||
      !acceptedRoleLabels.has(rolesForAssignee[0].label) ||
      !rolesForAssignee[0].id
    ) {
      commandException(
        `Workspace member ${assigneeId} must have exactly the ${expectedRoleLabel} or ${TEAM_WORKSPACE_ROLE_LABEL.team} role`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    return rolesForAssignee[0].id;
  }

  private async resolveOptionalClientScope({
    transactionScope,
    submittedClient,
  }: {
    transactionScope: WorkspaceTransactionScope;
    submittedClient: string | null;
  }): Promise<string | null> {
    if (submittedClient === null) {
      return null;
    }

    const clientRepository =
      transactionScope.getRepository<TeamWorkspaceClientEntity>('client', {
        shouldBypassPermissionChecks: true,
      });
    const matchingClients = await clientRepository.find({
      where: { client: submittedClient },
      select: { id: true, client: true },
      take: 2,
    });
    const exactMatches = matchingClients.filter(
      (clientRecord) => clientRecord.client === submittedClient,
    );

    if (exactMatches.length !== 1) {
      return commandException(
        `Client scope ${submittedClient} resolved to ${exactMatches.length} Client records`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    return submittedClient;
  }

  private assertProtocolLaneAndOutcome(
    input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>,
    authorization: TeamWorkspaceCommandAuthorization,
  ): void {
    const { roleLabel } = authorization;

    if (
      roleLabel === TEAM_WORKSPACE_ROLE_LABEL.sales &&
      input.lane !== TeamWorkspaceCommandLane.SALES
    ) {
      commandException(
        'Sales can create only Sales protocol records',
        TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
      );
    }

    if (
      roleLabel === TEAM_WORKSPACE_ROLE_LABEL.operations &&
      input.lane !== TeamWorkspaceCommandLane.OPERATIONS
    ) {
      commandException(
        'Operations can create only Operations protocol records',
        TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
      );
    }

    const requiredLaneByKind: Partial<
      Record<TeamWorkspaceProtocolTaskKind, TeamWorkspaceCommandLane>
    > = {
      [TeamWorkspaceProtocolTaskKind.COACHING_LESSON]:
        TeamWorkspaceCommandLane.SALES,
      [TeamWorkspaceProtocolTaskKind.CLIENT_UPDATE]:
        TeamWorkspaceCommandLane.OPERATIONS,
      [TeamWorkspaceProtocolTaskKind.BLOCKER]:
        TeamWorkspaceCommandLane.OPERATIONS,
      [TeamWorkspaceProtocolTaskKind.HANDOFF_RETURN]:
        TeamWorkspaceCommandLane.OPERATIONS,
    };
    const requiredLane = requiredLaneByKind[input.kind];

    if (requiredLane !== undefined && input.lane !== requiredLane) {
      commandException(
        `${input.kind} belongs to the ${requiredLane} lane`,
        TeamWorkspaceCommandExceptionCode.INVALID_INPUT,
      );
    }

    const isMeetingOutcome =
      input.kind === TeamWorkspaceProtocolTaskKind.MEETING_OUTCOME;

    if (isMeetingOutcome !== (input.meetingOutcome !== undefined)) {
      commandException(
        'meetingOutcome is required only for MEETING_OUTCOME',
        TeamWorkspaceCommandExceptionCode.INVALID_INPUT,
      );
    }
  }

  private protocolTargetObjectName(
    kind: TeamWorkspaceProtocolTaskKind,
  ): 'calendarEvent' | 'callRecording' | 'client' | 'task' {
    switch (kind) {
      case TeamWorkspaceProtocolTaskKind.MEETING_PREP:
      case TeamWorkspaceProtocolTaskKind.MEETING_OUTCOME:
        return 'calendarEvent';
      case TeamWorkspaceProtocolTaskKind.COACHING_LESSON:
        return 'callRecording';
      case TeamWorkspaceProtocolTaskKind.CLIENT_UPDATE:
        return 'client';
      case TeamWorkspaceProtocolTaskKind.BLOCKER:
      case TeamWorkspaceProtocolTaskKind.HANDOFF_RETURN:
        return 'task';
    }
  }

  private async deriveProtocolTask({
    transactionScope,
    input,
    authorization,
  }: {
    transactionScope: WorkspaceTransactionScope;
    input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>;
    authorization: TeamWorkspaceCommandAuthorization;
  }): Promise<ProtocolTaskDerivation> {
    switch (input.kind) {
      case TeamWorkspaceProtocolTaskKind.MEETING_PREP:
      case TeamWorkspaceProtocolTaskKind.MEETING_OUTCOME:
        return this.deriveMeetingProtocolTask({
          transactionScope,
          input,
          authorization,
        });
      case TeamWorkspaceProtocolTaskKind.COACHING_LESSON:
        return this.deriveCoachingProtocolTask({
          transactionScope,
          input,
          authorization,
        });
      case TeamWorkspaceProtocolTaskKind.CLIENT_UPDATE:
        return this.deriveClientUpdateProtocolTask({
          transactionScope,
          input,
          authorization,
        });
      case TeamWorkspaceProtocolTaskKind.BLOCKER:
      case TeamWorkspaceProtocolTaskKind.HANDOFF_RETURN:
        return this.deriveOperationalTaskProtocolTask({
          transactionScope,
          input,
          authorization,
        });
    }
  }

  private async deriveMeetingProtocolTask({
    transactionScope,
    input,
    authorization,
  }: {
    transactionScope: WorkspaceTransactionScope;
    input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>;
    authorization: TeamWorkspaceCommandAuthorization;
  }): Promise<ProtocolTaskDerivation> {
    const meeting = await this.readMeeting(transactionScope, input.targetId);
    const startsAt = timestampDate(meeting.startsAt, 'Meeting startsAt');
    const assigneeId = this.assertMeetingAccessAndDeriveAssignee(
      meeting,
      authorization,
    );
    const client = this.meetingClientScope(meeting);
    const meetingTitle = titleComponent(meeting.title, 'Untitled meeting');
    const isPrep = input.kind === TeamWorkspaceProtocolTaskKind.MEETING_PREP;

    if (isPrep && meeting.isCanceled) {
      commandException(
        `Canceled meeting ${meeting.id} cannot receive preparation`,
        TeamWorkspaceCommandExceptionCode.COMMAND_TIME_INVALID,
      );
    }

    if (isPrep && startsAt.getTime() <= Date.now()) {
      commandException(
        `Meeting ${meeting.id} has already started`,
        TeamWorkspaceCommandExceptionCode.COMMAND_TIME_INVALID,
      );
    }

    if (!isPrep) {
      const outcome = input.meetingOutcome;

      if (outcome === undefined) {
        return commandException(
          'Meeting outcome is required',
          TeamWorkspaceCommandExceptionCode.INVALID_INPUT,
        );
      }

      if (
        meeting.isCanceled !==
        (outcome === TeamWorkspaceMeetingOutcome.CANCELLED)
      ) {
        commandException(
          `Meeting ${meeting.id} cancellation state does not match ${outcome}`,
          TeamWorkspaceCommandExceptionCode.COMMAND_TIME_INVALID,
        );
      }

      if (
        outcome !== TeamWorkspaceMeetingOutcome.CANCELLED &&
        startsAt.getTime() > Date.now()
      ) {
        commandException(
          `Meeting ${meeting.id} has not started`,
          TeamWorkspaceCommandExceptionCode.COMMAND_TIME_INVALID,
        );
      }

      return {
        targetVersion: recordVersion(meeting.updatedAt),
        title: `${TEAM_WORKSPACE_RECORD_PREFIX.meetingOutcome} ${meeting.id} · ${meetingTitle}`,
        bodyMarkdown: [
          `**Result:** ${meetingOutcomeLabel(outcome)}`,
          `**Outcome:** ${input.content}`,
          `**Evidence:** ${input.evidence}`,
          `**Source:** ${input.source}`,
        ].join('\n\n'),
        client,
        dueAt: startsAt,
        status: COMPLETED_STATUS,
        workType: this.workTypeForLane(input.lane),
        assigneeId,
      };
    }

    return {
      targetVersion: recordVersion(meeting.updatedAt),
      title: `${TEAM_WORKSPACE_RECORD_PREFIX.meetingPrep} ${meeting.id} · ${meetingTitle}`,
      bodyMarkdown: [
        `**Preparation:** ${input.content}`,
        `**Evidence:** ${input.evidence}`,
        `**Source:** ${input.source}`,
      ].join('\n\n'),
      client,
      dueAt: startsAt,
      status: COMPLETED_STATUS,
      workType: this.workTypeForLane(input.lane),
      assigneeId,
    };
  }

  private async deriveCoachingProtocolTask({
    transactionScope,
    input,
    authorization,
  }: {
    transactionScope: WorkspaceTransactionScope;
    input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>;
    authorization: TeamWorkspaceCommandAuthorization;
  }): Promise<ProtocolTaskDerivation> {
    const repository =
      transactionScope.getRepository<TeamWorkspaceCallRecordingEntity>(
        'callRecording',
        { shouldBypassPermissionChecks: true },
      );
    const recording = await repository.findOne({
      where: { id: input.targetId },
    });

    if (recording === null) {
      return commandException(
        `Call recording ${input.targetId} was not found or is forbidden`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
      );
    }

    if (!this.hasEvidenceData(recording.transcript)) {
      commandException(
        `Call recording ${recording.id} has no transcript`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    if (recording.calendarEventId === null) {
      return commandException(
        `Call recording ${recording.id} has no linked meeting`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    const meeting = await this.readMeeting(
      transactionScope,
      recording.calendarEventId,
    );
    const assigneeId = this.assertMeetingAccessAndDeriveAssignee(
      meeting,
      authorization,
    );
    const client = this.meetingClientScope(meeting);
    const happenedAt = timestampDate(
      recording.endedAt ?? recording.startedAt,
      'Recording endedAt or startedAt',
    );

    if (happenedAt.getTime() > Date.now()) {
      commandException(
        `Call recording ${recording.id} is in the future`,
        TeamWorkspaceCommandExceptionCode.COMMAND_TIME_INVALID,
      );
    }

    return {
      targetVersion: recordVersion(recording.updatedAt),
      title: `${TEAM_WORKSPACE_RECORD_PREFIX.coaching} ${recording.id} · ${titleComponent(recording.title, 'Recorded call')}`,
      bodyMarkdown: [
        `**Improvement:** ${input.content}`,
        `**Evidence:** ${input.evidence}`,
        `**Source:** ${input.source}`,
      ].join('\n\n'),
      client,
      dueAt: happenedAt,
      status: 'TODO',
      workType: SALES_WORK_TYPE,
      assigneeId,
    };
  }

  private async deriveClientUpdateProtocolTask({
    transactionScope,
    input,
    authorization,
  }: {
    transactionScope: WorkspaceTransactionScope;
    input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>;
    authorization: TeamWorkspaceCommandAuthorization;
  }): Promise<ProtocolTaskDerivation> {
    const repository =
      transactionScope.getRepository<TeamWorkspaceClientEntity>('client', {
        shouldBypassPermissionChecks: true,
      });
    const clientRecord = await repository.findOne({
      where: { id: input.targetId },
    });

    if (clientRecord === null) {
      return commandException(
        `Client ${input.targetId} was not found or is forbidden`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
      );
    }

    const client = this.requiredClientScope(
      clientRecord.client,
      `Client ${clientRecord.id}`,
    );

    return {
      targetVersion: recordVersion(clientRecord.updatedAt),
      title: `${TEAM_WORKSPACE_RECORD_PREFIX.clientUpdate} ${client} · ${titleComponent(clientRecord.name, 'Client')}`,
      bodyMarkdown: [
        `**Verified update:** ${input.content}`,
        `**Evidence:** ${input.evidence}`,
        `**Source:** ${input.source}`,
      ].join('\n\n'),
      client,
      dueAt: null,
      status: COMPLETED_STATUS,
      workType: OPERATIONS_WORK_TYPE,
      assigneeId: authorization.principal.actor.workspaceMemberId,
    };
  }

  private async deriveOperationalTaskProtocolTask({
    transactionScope,
    input,
    authorization,
  }: {
    transactionScope: WorkspaceTransactionScope;
    input: Omit<CreateTeamWorkspaceProtocolTaskInput, 'idempotencyKey'>;
    authorization: TeamWorkspaceCommandAuthorization;
  }): Promise<ProtocolTaskDerivation> {
    const repository = transactionScope.getRepository<TeamWorkspaceTaskEntity>(
      'task',
      {
        shouldBypassPermissionChecks: true,
      },
    );
    const target = await repository.findOne({ where: { id: input.targetId } });

    if (target === null) {
      return commandException(
        `Task ${input.targetId} was not found or is forbidden`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
      );
    }

    if (!this.isOperationsLaneWideTask(target)) {
      commandException(
        `Task ${target.id} is not an Operations task or handoff`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    if (target.status === COMPLETED_STATUS) {
      commandException(
        `Completed task ${target.id} cannot receive ${input.kind}`,
        TeamWorkspaceCommandExceptionCode.INVALID_TRANSITION,
      );
    }

    const client = this.requiredClientScope(target.client, `Task ${target.id}`);
    const assigneeId =
      authorization.principal.actor.workspaceMemberId ?? target.assigneeId;

    if (input.kind === TeamWorkspaceProtocolTaskKind.HANDOFF_RETURN) {
      if (!target.title?.startsWith(TEAM_WORKSPACE_RECORD_PREFIX.handoff)) {
        commandException(
          `Task ${target.id} is not a Sales handoff`,
          TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
        );
      }

      return {
        targetVersion: recordVersion(target.updatedAt),
        title: `${TEAM_WORKSPACE_RECORD_PREFIX.handoffReturn} ${target.id} · ${client}`,
        bodyMarkdown: [
          `**Returned by Operations:** ${input.content}`,
          `**Evidence:** ${input.evidence}`,
          `**Source:** ${input.source}`,
        ].join('\n\n'),
        client,
        dueAt: target.dueAt,
        status: COMPLETED_STATUS,
        workType: OPERATIONS_WORK_TYPE,
        assigneeId,
      };
    }

    return {
      targetVersion: recordVersion(target.updatedAt),
      title: `${TEAM_WORKSPACE_RECORD_PREFIX.blocker} ${target.id} · ${titleComponent(target.title, 'Operational task')}`,
      bodyMarkdown: [
        `**Blocked task:** ${target.id}`,
        `**Reason:** ${input.content}`,
        `**Evidence:** ${input.evidence}`,
        `**Source:** ${input.source}`,
      ].join('\n\n'),
      client,
      dueAt: target.dueAt,
      status: 'IN_PROGRESS',
      workType: OPERATIONS_WORK_TYPE,
      assigneeId,
    };
  }

  private async readMeeting(
    transactionScope: WorkspaceTransactionScope,
    meetingId: string,
  ): Promise<TeamWorkspaceMeetingEntity> {
    const repository =
      transactionScope.getRepository<TeamWorkspaceMeetingEntity>(
        'calendarEvent',
        { shouldBypassPermissionChecks: true },
      );
    const meeting = await repository.findOne({
      where: { id: meetingId },
      relations: {
        calendarEventParticipants: { person: true },
      },
    });

    if (meeting === null) {
      return commandException(
        `Meeting ${meetingId} was not found or is forbidden`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
      );
    }

    return meeting;
  }

  private assertMeetingAccessAndDeriveAssignee(
    meeting: TeamWorkspaceMeetingEntity,
    authorization: TeamWorkspaceCommandAuthorization,
  ): string {
    const workspaceMemberIds = [
      ...new Set(
        (meeting.calendarEventParticipants ?? [])
          .map((participant) => participant.workspaceMemberId)
          .filter((id): id is string => typeof id === 'string' && id !== ''),
      ),
    ];
    const { principal, roleLabel } = authorization;

    if (isHumanLaneRole(roleLabel)) {
      const actorWorkspaceMemberId = principal.actor.workspaceMemberId;

      if (
        actorWorkspaceMemberId === null ||
        !workspaceMemberIds.includes(actorWorkspaceMemberId)
      ) {
        return commandException(
          `Meeting ${meeting.id} is not owned by ${principal.principalId}`,
          TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
        );
      }

      return actorWorkspaceMemberId;
    }

    if (workspaceMemberIds.length !== 1) {
      return commandException(
        `Meeting ${meeting.id} must have exactly one team assignee for privileged automation`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    return workspaceMemberIds[0];
  }

  private meetingClientScope(meeting: TeamWorkspaceMeetingEntity): string {
    const clientScopes = [
      ...new Set(
        (meeting.calendarEventParticipants ?? [])
          .map((participant) => participant.person?.client?.trim())
          .filter(
            (client): client is string =>
              typeof client === 'string' && client.length > 0,
          ),
      ),
    ];

    if (clientScopes.length !== 1) {
      return commandException(
        `Meeting ${meeting.id} must resolve to exactly one client scope`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    return clientScopes[0];
  }

  private requiredClientScope(
    client: string | null,
    recordName: string,
  ): string {
    const scope = client?.trim();

    if (!scope) {
      return commandException(
        `${recordName} has no client scope`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    return scope;
  }

  private hasEvidenceData(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === 'object' && Object.keys(value).length > 0;
  }

  private workTypeForLane(lane: TeamWorkspaceCommandLane): string {
    return lane === TeamWorkspaceCommandLane.SALES
      ? SALES_WORK_TYPE
      : OPERATIONS_WORK_TYPE;
  }

  private assertExpectedStateAndVersion({
    recordName,
    recordId,
    actualState,
    expectedState,
    actualVersion,
    expectedVersion,
  }: {
    recordName: string;
    recordId: string;
    actualState: string | null;
    expectedState: string;
    actualVersion: Date | string;
    expectedVersion: string;
  }): void {
    if (actualState !== expectedState) {
      commandException(
        `Expected ${recordName.toLowerCase()} state ${expectedState}, found ${actualState ?? 'null'}`,
        TeamWorkspaceCommandExceptionCode.EXPECTED_STATE_CONFLICT,
      );
    }

    const currentVersion = recordVersion(actualVersion);

    if (currentVersion !== expectedVersion) {
      commandException(
        `Expected ${recordName.toLowerCase()} ${recordId} version ${expectedVersion}, found ${currentVersion}`,
        TeamWorkspaceCommandExceptionCode.EXPECTED_VERSION_CONFLICT,
      );
    }
  }

  private assertWorkspaceIsEnabled(workspaceId: string): void {
    if (!this.workspaceDomainsService.isTeamWorkspaceId(workspaceId)) {
      commandException(
        `Workspace ${workspaceId} is not the configured team workspace`,
        TeamWorkspaceCommandExceptionCode.WORKSPACE_NOT_ENABLED,
      );
    }
  }

  private async authorizeCommand(
    authContext: WorkspaceAuthContext,
    command: TeamWorkspaceCommandName,
  ): Promise<TeamWorkspaceCommandAuthorization> {
    const principal = buildPrincipal(authContext);
    let roleLabel: TeamWorkspaceCommandAuthorization['roleLabel'];

    if (authContext.type === 'user') {
      const rolesByUserWorkspace =
        await this.userRoleService.getRolesByUserWorkspaces({
          userWorkspaceIds: [authContext.userWorkspaceId],
          workspaceId: authContext.workspace.id,
        });
      const roleLabels = [
        ...new Set(
          (rolesByUserWorkspace.get(authContext.userWorkspaceId) ?? []).map(
            (role) => role.label,
          ),
        ),
      ];
      const humanRoleLabels = new Set<string>([
        TEAM_WORKSPACE_ROLE_LABEL.sales,
        TEAM_WORKSPACE_ROLE_LABEL.operations,
        TEAM_WORKSPACE_ROLE_LABEL.team,
        TEAM_WORKSPACE_ROLE_LABEL.admin,
      ]);

      if (roleLabels.length !== 1 || !humanRoleLabels.has(roleLabels[0])) {
        commandException(
          `User has invalid team command roles: ${roleLabels.join(', ') || 'none'}`,
          TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
        );
      }

      roleLabel =
        roleLabels[0] as TeamWorkspaceCommandAuthorization['roleLabel'];
    } else if (authContext.type === 'apiKey') {
      const role = await this.apiKeyRoleService.getRoleDtoByApiKeyId({
        apiKeyId: authContext.apiKey.id,
        workspaceId: authContext.workspace.id,
      });

      if (role.label !== TEAM_AUTOMATION_ROLE_LABEL) {
        commandException(
          `API key role ${role.label} is not ${TEAM_AUTOMATION_ROLE_LABEL}`,
          TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
        );
      }

      roleLabel = TEAM_AUTOMATION_ROLE_LABEL;
    } else {
      return commandException(
        `Auth context type ${authContext.type} cannot run team commands`,
        TeamWorkspaceCommandExceptionCode.UNSUPPORTED_ACTOR,
      );
    }

    const allowedRoleLabels =
      command === 'createAssignedWork'
        ? new Set<string>([
            TEAM_WORKSPACE_ROLE_LABEL.admin,
            TEAM_AUTOMATION_ROLE_LABEL,
          ])
        : command === 'winOpportunityWithHandoff' ||
            command === 'updateOpportunityStage'
          ? new Set<string>([
              TEAM_WORKSPACE_ROLE_LABEL.sales,
              TEAM_WORKSPACE_ROLE_LABEL.team,
              TEAM_WORKSPACE_ROLE_LABEL.admin,
              TEAM_AUTOMATION_ROLE_LABEL,
            ])
          : new Set<string>([
              TEAM_WORKSPACE_ROLE_LABEL.sales,
              TEAM_WORKSPACE_ROLE_LABEL.operations,
              TEAM_WORKSPACE_ROLE_LABEL.team,
              TEAM_WORKSPACE_ROLE_LABEL.admin,
              TEAM_AUTOMATION_ROLE_LABEL,
            ]);

    if (!allowedRoleLabels.has(roleLabel)) {
      commandException(
        `Role ${roleLabel} cannot run ${command}`,
        TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
      );
    }

    return { principal, roleLabel };
  }

  private assertCanCompleteTask(
    task: TeamWorkspaceTaskEntity,
    authorization: TeamWorkspaceCommandAuthorization,
  ): void {
    const { principal, roleLabel } = authorization;

    if (coversBothLanes(roleLabel)) {
      return;
    }

    if (roleLabel === TEAM_WORKSPACE_ROLE_LABEL.operations) {
      if (this.isOperationsLaneWideTask(task)) {
        return;
      }

      commandException(
        `Task ${task.id} is not in the Operations lane`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
      );
    }

    if (
      roleLabel === TEAM_WORKSPACE_ROLE_LABEL.sales &&
      this.isOperationsLaneWideTask(task)
    ) {
      commandException(
        `Sales cannot complete Operations task ${task.id}`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
      );
    }

    if (!this.isTaskOwnedByPrincipal(task, principal)) {
      commandException(
        `Task ${task.id} is not assigned to or authored by ${principal.principalId}`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
      );
    }
  }

  private assertCanTransitionTask(
    task: TeamWorkspaceTaskEntity,
    authorization: TeamWorkspaceCommandAuthorization,
  ): void {
    const { principal, roleLabel } = authorization;

    if (coversBothLanes(roleLabel)) {
      return;
    }

    if (roleLabel === TEAM_WORKSPACE_ROLE_LABEL.operations) {
      if (this.isOperationsLaneWideTask(task)) {
        return;
      }

      commandException(
        `Task ${task.id} is not in the Operations lane`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
      );
    }

    if (
      this.isOperationsLaneWideTask(task) ||
      !this.isTaskOwnedByPrincipal(task, principal)
    ) {
      commandException(
        `Task ${task.id} is not a Sales-owned task for ${principal.principalId}`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
      );
    }
  }

  private isTaskOwnedByPrincipal(
    task: TeamWorkspaceTaskEntity,
    principal: TeamWorkspaceCommandPrincipal,
  ): boolean {
    const workspaceMemberId = principal.actor.workspaceMemberId;

    return (
      workspaceMemberId !== null &&
      (task.assigneeId === workspaceMemberId ||
        task.createdBy.workspaceMemberId === workspaceMemberId)
    );
  }

  private isOperationsLaneWideTask(task: TeamWorkspaceTaskEntity): boolean {
    return (
      task.workType?.toUpperCase() === OPERATIONS_WORK_TYPE ||
      task.title?.startsWith(TEAM_WORKSPACE_RECORD_PREFIX.blocker) === true ||
      task.title?.startsWith(TEAM_WORKSPACE_RECORD_PREFIX.clientUpdate) ===
        true ||
      task.title?.startsWith(TEAM_WORKSPACE_RECORD_PREFIX.handoff) === true ||
      task.title?.startsWith(TEAM_WORKSPACE_RECORD_PREFIX.handoffReturn) ===
        true ||
      task.title?.startsWith(TEAM_WORKSPACE_RECORD_PREFIX.promise) === true
    );
  }

  private async resolveHandoffClientScope({
    transactionScope,
    opportunity,
    submittedClient,
  }: {
    transactionScope: WorkspaceTransactionScope;
    opportunity: TeamWorkspaceOpportunityEntity;
    submittedClient: string;
  }): Promise<{ scope: string; shouldBackfill: boolean }> {
    const opportunityClient = optionalNonBlankText(opportunity.client);

    if (opportunityClient !== null) {
      if (submittedClient !== opportunityClient) {
        commandException(
          `Submitted client ${submittedClient} does not match opportunity client ${opportunityClient}`,
          TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
        );
      }

      return { scope: opportunityClient, shouldBackfill: false };
    }

    const clientRepository =
      transactionScope.getRepository<TeamWorkspaceClientEntity>('client', {
        shouldBypassPermissionChecks: true,
      });
    const matchingClients = await clientRepository.find({
      where: { client: submittedClient },
      select: { id: true, client: true },
      take: 2,
    });
    const exactMatches = matchingClients.filter(
      (client) => client.client === submittedClient,
    );

    if (exactMatches.length !== 1) {
      return commandException(
        `Client scope ${submittedClient} resolved to ${exactMatches.length} Client records`,
        TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
      );
    }

    return { scope: submittedClient, shouldBackfill: true };
  }

  private assertCanWinOpportunity(
    opportunity: TeamWorkspaceOpportunityEntity,
    authorization: TeamWorkspaceCommandAuthorization,
  ): void {
    const { roleLabel } = authorization;

    if (
      coversBothLanes(roleLabel) ||
      roleLabel === TEAM_WORKSPACE_ROLE_LABEL.sales
    ) {
      return;
    }

    commandException(
      `Role ${roleLabel} cannot win opportunity ${opportunity.id}`,
      TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
    );
  }

  private async acquireCommandLocks(
    transactionScope: WorkspaceTransactionScope,
    lockNames: string[],
  ): Promise<void> {
    for (const lockName of [...new Set(lockNames)].sort()) {
      await transactionScope.executeRawQuery(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [lockName],
      );
    }
  }

  private async readReceipt(
    transactionScope: WorkspaceTransactionScope,
    workspaceId: string,
    receiptKey: string,
  ): Promise<TeamWorkspaceCommandReceipt | null> {
    const rows = (await transactionScope.executeRawQuery(
      `SELECT "value"
       FROM "core"."keyValuePair"
       WHERE "workspaceId" = $1
         AND "key" = $2
         AND "userId" IS NULL
         AND "applicationId" IS NULL
       FOR UPDATE`,
      [workspaceId, receiptKey],
    )) as ReceiptRow[];

    if (rows.length === 0) {
      return null;
    }

    if (rows.length !== 1) {
      commandException(
        `Receipt key ${receiptKey} is not unique`,
        TeamWorkspaceCommandExceptionCode.RECEIPT_INTEGRITY_ERROR,
      );
    }

    return parseReceipt(rows[0].value);
  }

  private async insertReceipt(
    transactionScope: WorkspaceTransactionScope,
    workspaceId: string,
    receiptKey: string,
    receipt: TeamWorkspaceCommandReceipt,
  ): Promise<void> {
    const receiptId = deterministicCommandUuid(
      `${TEAM_WORKSPACE_COMMAND_RECEIPT_PREFIX}:receipt:${workspaceId}:${receiptKey}`,
    );
    const rows = await transactionScope.executeRawQuery(
      `INSERT INTO "core"."keyValuePair" (
         "id",
         "userId",
         "workspaceId",
         "applicationId",
         "key",
         "value",
         "textValueDeprecated",
         "type",
         "createdAt",
         "updatedAt",
         "deletedAt"
       ) VALUES ($1, NULL, $2, NULL, $3, $4::jsonb, NULL, 'CONFIG_VARIABLE', NOW(), NOW(), NULL)
       ON CONFLICT ("key", "workspaceId")
         WHERE "userId" IS NULL AND "applicationId" IS NULL
       DO NOTHING
       RETURNING "id"`,
      [receiptId, workspaceId, receiptKey, JSON.stringify(receipt)],
    );

    if (rows.length !== 1) {
      commandException(
        `Receipt key ${receiptKey} was claimed concurrently`,
        TeamWorkspaceCommandExceptionCode.IDEMPOTENCY_CONFLICT,
      );
    }
  }

  private async readReplayTarget<Entity extends { id: string }>(
    repository: {
      findOne(options: { where: { id: string } }): Promise<Entity | null>;
    },
    targetId: string,
  ): Promise<Entity> {
    const target = await repository.findOne({ where: { id: targetId } });

    if (target === null) {
      return commandException(
        `Replayed target ${targetId} is no longer readable`,
        TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN,
      );
    }

    return target;
  }
}
