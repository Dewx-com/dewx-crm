import { FindOperator } from 'typeorm';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import { type UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { type ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type CreateTeamWorkspaceAssignedWorkInput } from 'src/modules/team-workspace/commands/dtos/create-team-workspace-assigned-work.input';
import {
  type CreateTeamWorkspaceProtocolTaskInput,
  TeamWorkspaceCommandLane,
  TeamWorkspaceMeetingOutcome,
  TeamWorkspaceProtocolTaskKind,
} from 'src/modules/team-workspace/commands/dtos/create-team-workspace-protocol-task.input';
import { type TransitionTeamWorkspaceTaskInput } from 'src/modules/team-workspace/commands/dtos/transition-team-workspace-task.input';
import { type UpdateTeamWorkspaceOpportunityStageInput } from 'src/modules/team-workspace/commands/dtos/update-team-workspace-opportunity-stage.input';
import { TeamWorkspaceCommandExceptionCode } from 'src/modules/team-workspace/commands/exceptions/team-workspace-command.exception';
import { TeamWorkspaceCommandService } from 'src/modules/team-workspace/commands/team-workspace-command.service';

const WORKSPACE_ID = '35f718e0-e670-4aae-bbe7-0a9d0543a4ae';
const OTHER_WORKSPACE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORKSPACE_MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const USER_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
const API_KEY_ID = '33333333-3333-4333-8333-333333333333';
const TASK_ID = '44444444-4444-4444-8444-444444444444';
const OPPORTUNITY_ID = '55555555-5555-4555-8555-555555555555';
const MEETING_ID = '66666666-6666-4666-8666-666666666666';
const RECORDING_ID = '77777777-7777-4777-8777-777777777777';
const CLIENT_ID = '88888888-8888-4888-8888-888888888888';
const ASSIGNEE_ID = '99999999-9999-4999-8999-999999999999';
const VERSION = '2026-08-26T09:00:00.000Z';
const SUB_MILLISECOND_VERSION = '2026-08-26T09:00:00.000789Z';
const NEXT_MILLISECOND_VERSION = '2026-08-26T09:00:00.001000Z';
const NEXT_VERSION = '2026-08-26T09:01:00.000Z';

type FakeTask = {
  id: string;
  title: string;
  status: string;
  workType: string;
  client: string | null;
  updatedAt: string;
  createdAt?: string;
  assigneeId: string | null;
  createdBy: {
    source: string;
    workspaceMemberId: string | null;
    name: string;
    context: Record<string, never>;
  };
  updatedBy?: unknown;
  bodyV2?: { markdown?: string | null } | null;
  dueAt: Date | null;
};

type FakeOpportunity = {
  id: string;
  name: string;
  stage: string;
  client: string | null;
  updatedAt: string;
  ownerId: string | null;
  createdBy: FakeTask['createdBy'];
  updatedBy?: unknown;
};

type FakeMeeting = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isCanceled: boolean;
  updatedAt: string;
  calendarEventParticipants: Array<{
    workspaceMemberId: string | null;
    person: { client: string | null } | null;
  }>;
};

type FakeRecording = {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string;
  transcript: unknown;
  calendarEventId: string | null;
  updatedAt: string;
};

type FakeClient = {
  id: string;
  name: string;
  client: string | null;
  updatedAt: string;
};

type FakeState = {
  tasks: Map<string, FakeTask>;
  opportunities: Map<string, FakeOpportunity>;
  meetings: Map<string, FakeMeeting>;
  recordings: Map<string, FakeRecording>;
  clients: Map<string, FakeClient>;
  receipts: Map<string, unknown>;
};

const actor = {
  source: 'MANUAL',
  workspaceMemberId: WORKSPACE_MEMBER_ID,
  name: 'Abrar Hossain',
  context: {},
};

const task = (overrides: Partial<FakeTask> = {}): FakeTask => ({
  id: TASK_ID,
  title: 'Follow up · acme · Send proposal',
  status: 'IN_PROGRESS',
  workType: 'OUTREACH',
  client: 'acme',
  updatedAt: VERSION,
  createdAt: VERSION,
  assigneeId: WORKSPACE_MEMBER_ID,
  createdBy: actor,
  dueAt: null,
  ...overrides,
});

const opportunity = (
  overrides: Partial<FakeOpportunity> = {},
): FakeOpportunity => ({
  id: OPPORTUNITY_ID,
  name: 'Acme website',
  stage: 'DECISION',
  client: 'acme',
  updatedAt: VERSION,
  ownerId: WORKSPACE_MEMBER_ID,
  createdBy: actor,
  ...overrides,
});

const meeting = (overrides: Partial<FakeMeeting> = {}): FakeMeeting => ({
  id: MEETING_ID,
  title: 'Acme discovery',
  startsAt: '2099-08-27T09:00:00.000Z',
  endsAt: '2099-08-27T09:30:00.000Z',
  isCanceled: false,
  updatedAt: VERSION,
  calendarEventParticipants: [
    {
      workspaceMemberId: WORKSPACE_MEMBER_ID,
      person: null,
    },
    {
      workspaceMemberId: null,
      person: { client: 'acme' },
    },
  ],
  ...overrides,
});

const recording = (overrides: Partial<FakeRecording> = {}): FakeRecording => ({
  id: RECORDING_ID,
  title: 'Acme discovery recording',
  startedAt: '2026-08-25T09:00:00.000Z',
  endedAt: '2026-08-25T09:30:00.000Z',
  transcript: { text: 'Recorded client call' },
  calendarEventId: MEETING_ID,
  updatedAt: VERSION,
  ...overrides,
});

const client = (overrides: Partial<FakeClient> = {}): FakeClient => ({
  id: CLIENT_ID,
  name: 'Acme Ltd',
  client: 'acme',
  updatedAt: VERSION,
  ...overrides,
});

const cloneState = (state: FakeState): FakeState => ({
  tasks: new Map(
    [...state.tasks].map(([id, record]) => [id, structuredClone(record)]),
  ),
  opportunities: new Map(
    [...state.opportunities].map(([id, record]) => [
      id,
      structuredClone(record),
    ]),
  ),
  meetings: new Map(
    [...state.meetings].map(([id, record]) => [id, structuredClone(record)]),
  ),
  recordings: new Map(
    [...state.recordings].map(([id, record]) => [id, structuredClone(record)]),
  ),
  clients: new Map(
    [...state.clients].map(([id, record]) => [id, structuredClone(record)]),
  ),
  receipts: new Map(
    [...state.receipts].map(([key, receipt]) => [
      key,
      structuredClone(receipt),
    ]),
  ),
});

const replaceState = (target: FakeState, source: FakeState): void => {
  target.tasks = source.tasks;
  target.opportunities = source.opportunities;
  target.meetings = source.meetings;
  target.recordings = source.recordings;
  target.clients = source.clients;
  target.receipts = source.receipts;
};

const timestampMicroseconds = (value: unknown): number => {
  if (value instanceof Date) {
    return value.getTime() * 1_000;
  }

  if (typeof value !== 'string') {
    throw new TypeError('Expected a timestamp');
  }

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d{1,6})Z$/,
  );

  if (match === null) {
    return new Date(value).getTime() * 1_000;
  }

  const fraction = match[2].padEnd(6, '0');
  const milliseconds = new Date(
    `${match[1]}.${fraction.slice(0, 3)}Z`,
  ).getTime();

  return milliseconds * 1_000 + Number(fraction.slice(3));
};

const matchesValue = (actual: unknown, expected: unknown): boolean => {
  if (!(expected instanceof FindOperator)) {
    return actual === expected;
  }

  if (expected.type !== 'raw') {
    throw new Error(`Unexpected find operator: ${expected.type}`);
  }

  const parameters = expected.objectLiteralParameters;
  const start = parameters?.teamWorkspaceRecordVersionStart;
  const end = parameters?.teamWorkspaceRecordVersionEnd;

  if (typeof start !== 'string' || typeof end !== 'string') {
    throw new Error('Expected millisecond record-version range parameters');
  }

  const actualTimestamp = timestampMicroseconds(actual);

  return (
    actualTimestamp >= timestampMicroseconds(start) &&
    actualTimestamp < timestampMicroseconds(end)
  );
};

const matches = (
  record: Record<string, unknown>,
  criteria: Record<string, unknown>,
): boolean =>
  Object.entries(criteria).every(([key, value]) =>
    matchesValue(record[key], value),
  );

const buildRepository = <Entity extends { id: string; updatedAt: string }>(
  records: Map<string, Entity>,
  options: {
    forceUpdateConflict: boolean;
    updatedAtBeforeUpdate?: string;
  },
) => ({
  findOne: jest.fn(
    async ({ where: { id } }: { where: { id: string } }) =>
      records.get(id) ?? null,
  ),
  find: jest.fn(
    async ({
      where = {},
      take,
    }: {
      where?: Record<string, unknown>;
      take?: number;
    } = {}) => {
      const matchesWhere = [...records.values()].filter((record) =>
        matches(record as Record<string, unknown>, where),
      );

      return take === undefined ? matchesWhere : matchesWhere.slice(0, take);
    },
  ),
  insert: jest.fn(async (record: Partial<Entity> & { id: string }) => {
    if (records.has(record.id)) {
      throw new Error(`duplicate ${record.id}`);
    }

    records.set(record.id, {
      createdAt: NEXT_VERSION,
      updatedAt: NEXT_VERSION,
      ...record,
    } as unknown as Entity);

    return { identifiers: [{ id: record.id }] };
  }),
  update: jest.fn(
    async (criteria: Record<string, unknown>, update: Partial<Entity>) => {
      const record = records.get(String(criteria.id));

      if (record !== undefined && options.updatedAtBeforeUpdate !== undefined) {
        record.updatedAt = options.updatedAtBeforeUpdate;
      }

      if (
        options.forceUpdateConflict ||
        record === undefined ||
        !matches(record as Record<string, unknown>, criteria)
      ) {
        return { affected: 0 };
      }

      records.set(record.id, {
        ...record,
        ...update,
        updatedAt: NEXT_VERSION,
      });

      return { affected: 1 };
    },
  ),
});

const userAuthContext = (workspaceId = WORKSPACE_ID): WorkspaceAuthContext =>
  ({
    type: 'user',
    workspace: { id: workspaceId },
    userWorkspaceId: USER_WORKSPACE_ID,
    user: { id: 'user-id' },
    workspaceMemberId: WORKSPACE_MEMBER_ID,
    workspaceMember: {
      id: WORKSPACE_MEMBER_ID,
      name: { firstName: 'Abrar', lastName: 'Hossain' },
    },
  }) as unknown as WorkspaceAuthContext;

const apiKeyAuthContext = (): WorkspaceAuthContext =>
  ({
    type: 'apiKey',
    workspace: { id: WORKSPACE_ID },
    apiKey: { id: API_KEY_ID, name: 'PE Team MCP' },
  }) as unknown as WorkspaceAuthContext;

const completeInput = (overrides: Record<string, unknown> = {}) => ({
  taskId: TASK_ID,
  expectedStatus: 'IN_PROGRESS' as const,
  expectedVersion: VERSION,
  evidence: 'Proposal PDF delivered and acknowledged.',
  source: 'CRM note 42',
  idempotencyKey: 'complete-task-0001',
  ...overrides,
});

const winInput = (overrides: Record<string, unknown> = {}) => ({
  opportunityId: OPPORTUNITY_ID,
  expectedStage: 'DECISION',
  expectedVersion: VERSION,
  company: 'Acme Ltd',
  contact: 'Client Contact',
  client: 'acme',
  problem: 'The current website does not convert qualified traffic.',
  agreedScope: 'Design and build the approved five-page site.',
  promises: 'Staging review within ten business days.',
  nextCommitment: 'Operations sends the kickoff agenda tomorrow.',
  evidence: 'Signed scope recorded in CRM note 84.',
  source: 'CRM note 84',
  idempotencyKey: 'win-opportunity-0001',
  ...overrides,
});

const protocolInput = (
  overrides: Partial<CreateTeamWorkspaceProtocolTaskInput> = {},
): CreateTeamWorkspaceProtocolTaskInput => ({
  kind: TeamWorkspaceProtocolTaskKind.MEETING_PREP,
  lane: TeamWorkspaceCommandLane.SALES,
  targetId: MEETING_ID,
  content: 'Review the account facts and confirm the next commitment.',
  evidence: 'CRM opportunity and calendar event reviewed.',
  source: 'CRM meeting 66',
  idempotencyKey: 'protocol-task-0001',
  ...overrides,
});

const transitionInput = (
  overrides: Partial<TransitionTeamWorkspaceTaskInput> = {},
): TransitionTeamWorkspaceTaskInput => ({
  taskId: TASK_ID,
  expectedStatus: 'IN_PROGRESS',
  expectedVersion: VERSION,
  nextStatus: 'TODO',
  idempotencyKey: 'transition-task-0001',
  ...overrides,
});

const stageInput = (
  overrides: Partial<UpdateTeamWorkspaceOpportunityStageInput> = {},
): UpdateTeamWorkspaceOpportunityStageInput => ({
  opportunityId: OPPORTUNITY_ID,
  expectedStage: 'DECISION',
  expectedVersion: VERSION,
  nextStage: 'NURTURE',
  idempotencyKey: 'opportunity-stage-0001',
  ...overrides,
});

const assignedWorkInput = (
  overrides: Partial<CreateTeamWorkspaceAssignedWorkInput> = {},
): CreateTeamWorkspaceAssignedWorkInput => ({
  lane: TeamWorkspaceCommandLane.SALES,
  assigneeId: ASSIGNEE_ID,
  title: 'Prepare the Acme proposal follow-up',
  detail: 'Review the call outcome and send the agreed proposal.',
  dueAt: '2026-08-28T09:00:00.000Z',
  client: 'acme',
  idempotencyKey: 'assigned-work-0001',
  ...overrides,
});

const buildHarness = ({
  roleLabel = 'Sales',
  apiKeyRoleLabel = 'Team Automation',
  workspaceEnabled = true,
  forceUpdateConflict = false,
  updatedAtBeforeUpdate,
  assigneeRoleLabels = ['Sales'],
  forceReceiptFailure = false,
  initialTasks = [task()],
  initialOpportunities = [opportunity()],
  initialMeetings = [meeting()],
  initialRecordings = [recording()],
  initialClients = [client()],
}: {
  roleLabel?: string;
  apiKeyRoleLabel?: string;
  workspaceEnabled?: boolean;
  forceUpdateConflict?: boolean;
  updatedAtBeforeUpdate?: string;
  assigneeRoleLabels?: string[];
  forceReceiptFailure?: boolean;
  initialTasks?: FakeTask[];
  initialOpportunities?: FakeOpportunity[];
  initialMeetings?: FakeMeeting[];
  initialRecordings?: FakeRecording[];
  initialClients?: FakeClient[];
} = {}) => {
  const state: FakeState = {
    tasks: new Map(initialTasks.map((record) => [record.id, record])),
    opportunities: new Map(
      initialOpportunities.map((record) => [record.id, record]),
    ),
    meetings: new Map(initialMeetings.map((record) => [record.id, record])),
    recordings: new Map(initialRecordings.map((record) => [record.id, record])),
    clients: new Map(initialClients.map((record) => [record.id, record])),
    receipts: new Map(),
  };
  const repositoryCalls: Array<[string, unknown]> = [];
  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    runInWorkspaceTransaction: jest.fn(
      async (callback: (scope: WorkspaceTransactionScope) => unknown) => {
        const transactionState = cloneState(state);
        const taskRepository = buildRepository(transactionState.tasks, {
          forceUpdateConflict,
          updatedAtBeforeUpdate,
        });
        const opportunityRepository = buildRepository(
          transactionState.opportunities,
          { forceUpdateConflict, updatedAtBeforeUpdate },
        );
        const meetingRepository = buildRepository(transactionState.meetings, {
          forceUpdateConflict,
          updatedAtBeforeUpdate,
        });
        const recordingRepository = buildRepository(
          transactionState.recordings,
          { forceUpdateConflict, updatedAtBeforeUpdate },
        );
        const clientRepository = buildRepository(transactionState.clients, {
          forceUpdateConflict,
          updatedAtBeforeUpdate,
        });
        const scope = {
          getRepository: jest.fn((objectName: string, config: unknown) => {
            repositoryCalls.push([objectName, config]);

            switch (objectName) {
              case 'task':
                return taskRepository;
              case 'opportunity':
                return opportunityRepository;
              case 'calendarEvent':
                return meetingRepository;
              case 'callRecording':
                return recordingRepository;
              case 'client':
                return clientRepository;
              default:
                throw new Error(`Unexpected repository: ${objectName}`);
            }
          }),
          executeRawQuery: jest.fn(
            async (sql: string, parameters: unknown[] = []) => {
              if (sql.includes('pg_advisory_xact_lock')) {
                return [];
              }

              if (sql.includes('SELECT "value"')) {
                const receipt = transactionState.receipts.get(
                  String(parameters[1]),
                );

                return receipt === undefined ? [] : [{ value: receipt }];
              }

              if (sql.includes('INSERT INTO "core"."keyValuePair"')) {
                if (forceReceiptFailure) {
                  throw new Error('forced receipt failure');
                }

                const receiptKey = String(parameters[2]);

                if (transactionState.receipts.has(receiptKey)) {
                  return [];
                }

                transactionState.receipts.set(
                  receiptKey,
                  JSON.parse(String(parameters[3])),
                );

                return [{ id: parameters[0] }];
              }

              throw new Error(`Unexpected raw SQL: ${sql}`);
            },
          ),
        } as unknown as WorkspaceTransactionScope;

        const result = await callback(scope);

        replaceState(state, transactionState);

        return result;
      },
    ),
  };
  const workspaceDomainsService = {
    isTeamWorkspaceId: jest.fn(
      (workspaceId: string) => workspaceEnabled && workspaceId === WORKSPACE_ID,
    ),
  };
  const userRoleService = {
    getRolesByUserWorkspaces: jest
      .fn()
      .mockResolvedValue(
        new Map([[USER_WORKSPACE_ID, [{ id: 'role-id', label: roleLabel }]]]),
      ),
    getWorkspaceMembersAssignedToRole: jest
      .fn()
      .mockImplementation((roleId: string) =>
        Promise.resolve(
          assigneeRoleLabels.some(
            (label) =>
              roleId === `role-${label.toLowerCase().replace(/ /g, '-')}`,
          )
            ? [{ id: ASSIGNEE_ID }]
            : [],
        ),
      ),
  };
  const roleLabels = [
    ...new Set(['Sales', 'Operations', 'Admin', ...assigneeRoleLabels]),
  ];
  const roleService = {
    getWorkspaceRoles: jest.fn().mockResolvedValue(
      roleLabels.map((label) => ({
        id: `role-${label.toLowerCase().replace(/ /g, '-')}`,
        label,
      })),
    ),
  };
  const apiKeyRoleService = {
    getRoleDtoByApiKeyId: jest.fn().mockResolvedValue({
      id: 'api-role-id',
      label: apiKeyRoleLabel,
    }),
  };
  const service = new TeamWorkspaceCommandService(
    globalWorkspaceOrmManager as unknown as GlobalWorkspaceOrmManager,
    workspaceDomainsService as unknown as WorkspaceDomainsService,
    userRoleService as unknown as UserRoleService,
    apiKeyRoleService as unknown as ApiKeyRoleService,
    roleService as unknown as RoleService,
  );

  return {
    apiKeyRoleService,
    globalWorkspaceOrmManager,
    repositoryCalls,
    roleService,
    service,
    state,
    userRoleService,
    workspaceDomainsService,
  };
};

const expectCommandError = async (
  command: Promise<unknown>,
  code: TeamWorkspaceCommandExceptionCode,
) => {
  await expect(command).rejects.toMatchObject({ code });
};

describe('TeamWorkspaceCommandService', () => {
  it('completes a human-owned task with evidence and an atomic receipt', async () => {
    const harness = buildHarness();

    const receipt = await harness.service.completeTaskWithEvidence(
      userAuthContext(),
      completeInput(),
    );

    expect(receipt).toMatchObject({
      command: 'completeTaskWithEvidence',
      targetId: TASK_ID,
      resultState: 'DONE',
      resultVersion: NEXT_VERSION,
      replayed: false,
    });
    expect(receipt.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(harness.state.tasks.get(TASK_ID)?.status).toBe('DONE');

    const evidence = [...harness.state.tasks.values()].find((record) =>
      record.title.startsWith('Completion evidence ·'),
    );

    expect(evidence).toMatchObject({
      client: 'acme',
      status: 'DONE',
      createdBy: expect.objectContaining({
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        name: 'Abrar Hossain',
      }),
    });
    expect(evidence?.bodyV2?.markdown).toContain(
      '**Completion evidence:** Proposal PDF delivered and acknowledged.',
    );
    expect(evidence?.bodyV2?.markdown).toContain('Source: CRM note 42');
    expect(harness.state.receipts.size).toBe(1);
    expect(harness.repositoryCalls).toEqual(
      expect.arrayContaining([
        ['task', { shouldBypassPermissionChecks: true }],
      ]),
    );
  });

  it('returns the durable receipt on an exact replay without a second write', async () => {
    const harness = buildHarness();
    const first = await harness.service.completeTaskWithEvidence(
      userAuthContext(),
      completeInput(),
    );
    const taskCount = harness.state.tasks.size;
    const second = await harness.service.completeTaskWithEvidence(
      userAuthContext(),
      completeInput(),
    );

    expect(second).toEqual({ ...first, replayed: true });
    expect(harness.state.tasks.size).toBe(taskCount);
    expect(harness.state.receipts.size).toBe(1);
  });

  it('rejects the same idempotency key with a different canonical payload', async () => {
    const harness = buildHarness();

    await harness.service.completeTaskWithEvidence(
      userAuthContext(),
      completeInput(),
    );

    await expectCommandError(
      harness.service.completeTaskWithEvidence(
        userAuthContext(),
        completeInput({ evidence: 'Different delivery claim.' }),
      ),
      TeamWorkspaceCommandExceptionCode.IDEMPOTENCY_CONFLICT,
    );
  });

  it('rolls evidence back when the optimistic task update loses a race', async () => {
    const harness = buildHarness({ forceUpdateConflict: true });

    await expectCommandError(
      harness.service.completeTaskWithEvidence(
        userAuthContext(),
        completeInput(),
      ),
      TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
    );

    expect(harness.state.tasks.size).toBe(1);
    expect(harness.state.tasks.get(TASK_ID)?.status).toBe('IN_PROGRESS');
    expect(harness.state.receipts.size).toBe(0);
  });

  it('atomically creates Admin-assigned Sales work with server-derived fields', async () => {
    const harness = buildHarness({ roleLabel: 'Admin', initialTasks: [] });

    const receipt = await harness.service.createAssignedWork(
      userAuthContext(),
      assignedWorkInput(),
    );
    const created = harness.state.tasks.get(receipt.sideEffectRecordId);

    expect(receipt).toMatchObject({
      command: 'createAssignedWork',
      targetId: ASSIGNEE_ID,
      resultState: 'TODO',
      replayed: false,
    });
    expect(receipt.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created).toMatchObject({
      title: 'Prepare the Acme proposal follow-up',
      status: 'TODO',
      workType: 'OUTREACH',
      client: 'acme',
      assigneeId: ASSIGNEE_ID,
      dueAt: new Date('2026-08-28T09:00:00.000Z'),
      createdBy: expect.objectContaining({
        workspaceMemberId: WORKSPACE_MEMBER_ID,
      }),
    });
    expect(created?.bodyV2?.markdown).toContain(
      '**Assignment:** Review the call outcome and send the agreed proposal.',
    );
    expect(harness.state.receipts.size).toBe(1);
  });

  it('exactly replays assigned work and rejects altered data under the same key', async () => {
    const harness = buildHarness({ roleLabel: 'Admin', initialTasks: [] });
    const first = await harness.service.createAssignedWork(
      userAuthContext(),
      assignedWorkInput(),
    );
    const taskCount = harness.state.tasks.size;
    const replay = await harness.service.createAssignedWork(
      userAuthContext(),
      assignedWorkInput(),
    );

    expect(replay).toEqual({ ...first, replayed: true });
    expect(harness.state.tasks.size).toBe(taskCount);

    await expectCommandError(
      harness.service.createAssignedWork(
        userAuthContext(),
        assignedWorkInput({ title: 'A different assignment' }),
      ),
      TeamWorkspaceCommandExceptionCode.IDEMPOTENCY_CONFLICT,
    );
    expect(harness.state.tasks.size).toBe(taskCount);
    expect(harness.state.receipts.size).toBe(1);
  });

  it('allows Team Automation to assign Operations work without impersonating a human', async () => {
    const harness = buildHarness({
      assigneeRoleLabels: ['Operations'],
      initialTasks: [],
    });

    const receipt = await harness.service.createAssignedWork(
      apiKeyAuthContext(),
      assignedWorkInput({
        lane: TeamWorkspaceCommandLane.OPERATIONS,
        client: null,
      }),
    );
    const created = harness.state.tasks.get(receipt.sideEffectRecordId);

    expect(created).toMatchObject({
      status: 'TODO',
      workType: 'SOFTWARE',
      client: null,
      assigneeId: ASSIGNEE_ID,
      createdBy: expect.objectContaining({
        source: 'API',
        workspaceMemberId: null,
        name: 'PE Team MCP',
      }),
    });
  });

  it.each(['Sales', 'Operations'])(
    'denies assigned-work creation to a %s employee before opening a transaction',
    async (roleLabel) => {
      const harness = buildHarness({ roleLabel, initialTasks: [] });

      await expectCommandError(
        harness.service.createAssignedWork(
          userAuthContext(),
          assignedWorkInput(),
        ),
        TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
      );
      expect(
        harness.globalWorkspaceOrmManager.runInWorkspaceTransaction,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      name: 'the other lane',
      assigneeRoleLabels: ['Sales'],
      lane: TeamWorkspaceCommandLane.OPERATIONS,
    },
    {
      name: 'multiple roles',
      assigneeRoleLabels: ['Sales', 'Operations'],
      lane: TeamWorkspaceCommandLane.SALES,
    },
  ])('rejects an assignee with $name', async ({ assigneeRoleLabels, lane }) => {
    const harness = buildHarness({
      roleLabel: 'Admin',
      assigneeRoleLabels,
      initialTasks: [],
    });

    await expectCommandError(
      harness.service.createAssignedWork(
        userAuthContext(),
        assignedWorkInput({ lane }),
      ),
      TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
    );
    expect(harness.state.tasks.size).toBe(0);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('rejects a non-existent client scope without creating work', async () => {
    const harness = buildHarness({ roleLabel: 'Admin', initialTasks: [] });

    await expectCommandError(
      harness.service.createAssignedWork(
        userAuthContext(),
        assignedWorkInput({ client: 'missing-client' }),
      ),
      TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
    );
    expect(harness.state.tasks.size).toBe(0);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('rolls assigned work back when the durable receipt insert fails', async () => {
    const harness = buildHarness({
      roleLabel: 'Admin',
      forceReceiptFailure: true,
      initialTasks: [],
    });

    await expect(
      harness.service.createAssignedWork(
        userAuthContext(),
        assignedWorkInput(),
      ),
    ).rejects.toThrow('forced receipt failure');
    expect(harness.state.tasks.size).toBe(0);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('atomically wins a Sales-owned opportunity and creates the full handoff', async () => {
    const harness = buildHarness();

    const receipt = await harness.service.winOpportunityWithHandoff(
      userAuthContext(),
      winInput(),
    );

    expect(receipt).toMatchObject({
      command: 'winOpportunityWithHandoff',
      targetId: OPPORTUNITY_ID,
      sideEffectRecordId: OPPORTUNITY_ID,
      resultState: 'CUSTOMER',
      replayed: false,
    });
    expect(harness.state.opportunities.get(OPPORTUNITY_ID)?.stage).toBe(
      'CUSTOMER',
    );
    const handoff = harness.state.tasks.get(OPPORTUNITY_ID);

    expect(handoff).toMatchObject({
      title: `Handoff · ${OPPORTUNITY_ID} · Acme Ltd`,
      client: 'acme',
      status: 'TODO',
    });
    expect(handoff?.bodyV2?.markdown).toContain(
      '**Next commitment:** Operations sends the kickoff agenda tomorrow.',
    );
    expect(handoff?.bodyV2?.markdown).toContain('**Source:** CRM note 84');
    expect(harness.repositoryCalls).toEqual(
      expect.arrayContaining([
        ['opportunity', { shouldBypassPermissionChecks: true }],
        ['task', { shouldBypassPermissionChecks: true }],
      ]),
    );
  });

  it('rejects a handoff client that does not exactly match the opportunity scope', async () => {
    const harness = buildHarness();

    await expectCommandError(
      harness.service.winOpportunityWithHandoff(
        userAuthContext(),
        winInput({ client: 'wrong-client' }),
      ),
      TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
    );

    expect(harness.state.opportunities.get(OPPORTUNITY_ID)).toMatchObject({
      stage: 'DECISION',
      client: 'acme',
    });
    expect(harness.state.tasks.has(OPPORTUNITY_ID)).toBe(false);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('backfills a blank opportunity client only from one matching Client record', async () => {
    const harness = buildHarness({
      initialOpportunities: [opportunity({ client: null })],
    });

    const receipt = await harness.service.winOpportunityWithHandoff(
      userAuthContext(),
      winInput(),
    );

    expect(receipt).toMatchObject({ resultState: 'CUSTOMER' });
    expect(harness.state.opportunities.get(OPPORTUNITY_ID)).toMatchObject({
      stage: 'CUSTOMER',
      client: 'acme',
    });
    expect(harness.state.tasks.get(OPPORTUNITY_ID)?.client).toBe('acme');
    expect(harness.repositoryCalls).toContainEqual([
      'client',
      { shouldBypassPermissionChecks: true },
    ]);
  });

  it('rejects a blank opportunity scope when no matching Client exists', async () => {
    const harness = buildHarness({
      initialOpportunities: [opportunity({ client: null })],
      initialClients: [],
    });

    await expectCommandError(
      harness.service.winOpportunityWithHandoff(userAuthContext(), winInput()),
      TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
    );

    expect(harness.state.opportunities.get(OPPORTUNITY_ID)).toMatchObject({
      stage: 'DECISION',
      client: null,
    });
    expect(harness.state.tasks.has(OPPORTUNITY_ID)).toBe(false);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('rejects an ambiguous client backfill when the scope is duplicated', async () => {
    const harness = buildHarness({
      initialOpportunities: [opportunity({ client: null })],
      initialClients: [
        client(),
        client({
          id: '99999999-9999-4999-8999-999999999999',
          name: 'Duplicate Acme',
        }),
      ],
    });

    await expectCommandError(
      harness.service.winOpportunityWithHandoff(userAuthContext(), winInput()),
      TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID,
    );

    expect(harness.state.opportunities.get(OPPORTUNITY_ID)?.client).toBeNull();
    expect(harness.state.tasks.has(OPPORTUNITY_ID)).toBe(false);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('rolls back handoff and client backfill when the opportunity update loses a race', async () => {
    const harness = buildHarness({
      forceUpdateConflict: true,
      initialOpportunities: [opportunity({ client: null })],
    });

    await expectCommandError(
      harness.service.winOpportunityWithHandoff(userAuthContext(), winInput()),
      TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
    );

    expect(harness.state.opportunities.get(OPPORTUNITY_ID)).toMatchObject({
      stage: 'DECISION',
      client: null,
    });
    expect(harness.state.tasks.has(OPPORTUNITY_ID)).toBe(false);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('lets only the exact Team Automation API-key role use the privileged command', async () => {
    const allowed = buildHarness();

    await expect(
      allowed.service.winOpportunityWithHandoff(
        apiKeyAuthContext(),
        winInput(),
      ),
    ).resolves.toMatchObject({ resultState: 'CUSTOMER' });
    expect(allowed.state.tasks.get(OPPORTUNITY_ID)?.createdBy).toMatchObject({
      source: 'API',
      workspaceMemberId: null,
      name: 'PE Team MCP',
    });

    const adminApiKey = buildHarness({ apiKeyRoleLabel: 'Admin' });

    await expectCommandError(
      adminApiKey.service.winOpportunityWithHandoff(
        apiKeyAuthContext(),
        winInput(),
      ),
      TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
    );
    expect(
      adminApiKey.globalWorkspaceOrmManager.runInWorkspaceTransaction,
    ).not.toHaveBeenCalled();
  });

  it('fails before role lookup or transaction for any non-capability workspace UUID', async () => {
    const harness = buildHarness({ workspaceEnabled: false });

    await expectCommandError(
      harness.service.completeTaskWithEvidence(
        userAuthContext(OTHER_WORKSPACE_ID),
        completeInput(),
      ),
      TeamWorkspaceCommandExceptionCode.WORKSPACE_NOT_ENABLED,
    );
    expect(
      harness.userRoleService.getRolesByUserWorkspaces,
    ).not.toHaveBeenCalled();
    expect(
      harness.globalWorkspaceOrmManager.runInWorkspaceTransaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects cross-owner human writes and Operations opportunity wins', async () => {
    const otherMember = '99999999-9999-4999-8999-999999999999';
    const unowned = buildHarness({
      initialTasks: [
        task({
          assigneeId: otherMember,
          createdBy: { ...actor, workspaceMemberId: otherMember },
        }),
      ],
    });

    await expectCommandError(
      unowned.service.completeTaskWithEvidence(
        userAuthContext(),
        completeInput(),
      ),
      TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
    );
    expect(unowned.state.receipts.size).toBe(0);

    const operations = buildHarness({ roleLabel: 'Operations' });

    await expectCommandError(
      operations.service.winOpportunityWithHandoff(
        userAuthContext(),
        winInput(),
      ),
      TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
    );
    expect(
      operations.globalWorkspaceOrmManager.runInWorkspaceTransaction,
    ).not.toHaveBeenCalled();
  });

  it('keeps Operations completion closed to an owned Sales task', async () => {
    const harness = buildHarness({ roleLabel: 'Operations' });

    await expectCommandError(
      harness.service.completeTaskWithEvidence(
        userAuthContext(),
        completeInput(),
      ),
      TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED,
    );

    expect(harness.state.tasks.get(TASK_ID)?.status).toBe('IN_PROGRESS');
    expect(harness.state.tasks.size).toBe(1);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('creates a server-derived meeting preparation and exactly replays it', async () => {
    const harness = buildHarness();
    const first = await harness.service.createProtocolTask(
      userAuthContext(),
      protocolInput(),
    );
    const created = harness.state.tasks.get(first.sideEffectRecordId);

    expect(first).toMatchObject({
      command: 'createProtocolTask',
      targetId: MEETING_ID,
      resultState: 'DONE',
      replayed: false,
    });
    expect(created).toMatchObject({
      title: `Meeting prep · ${MEETING_ID} · Acme discovery`,
      client: 'acme',
      status: 'DONE',
      workType: 'OUTREACH',
      assigneeId: WORKSPACE_MEMBER_ID,
    });
    expect(created?.bodyV2?.markdown).toContain(
      '**Preparation:** Review the account facts and confirm the next commitment.',
    );
    expect(created?.bodyV2?.markdown).toContain(
      '**Evidence:** CRM opportunity and calendar event reviewed.',
    );

    const countAfterFirst = harness.state.tasks.size;
    const replay = await harness.service.createProtocolTask(
      userAuthContext(),
      protocolInput(),
    );

    expect(replay).toEqual({ ...first, replayed: true });
    expect(harness.state.tasks.size).toBe(countAfterFirst);
  });

  it('replays a durable protocol receipt after its source target changes state', async () => {
    const harness = buildHarness({
      roleLabel: 'Operations',
      initialTasks: [task({ status: 'TODO', workType: 'SOFTWARE' })],
    });
    const input = protocolInput({
      kind: TeamWorkspaceProtocolTaskKind.BLOCKER,
      lane: TeamWorkspaceCommandLane.OPERATIONS,
      targetId: TASK_ID,
      content: 'Waiting for the approved production credentials.',
      evidence: 'Credential request is recorded in the client channel.',
      source: 'CRM task 44',
      idempotencyKey: 'blocker-task-0001',
    });
    const first = await harness.service.createProtocolTask(
      userAuthContext(),
      input,
    );
    const changedTarget = harness.state.tasks.get(TASK_ID);

    if (changedTarget === undefined) {
      throw new Error('Expected source task');
    }

    changedTarget.status = 'DONE';
    changedTarget.updatedAt = NEXT_VERSION;

    await expect(
      harness.service.createProtocolTask(userAuthContext(), input),
    ).resolves.toEqual({ ...first, replayed: true });
    expect(harness.state.tasks.has(first.sideEffectRecordId)).toBe(true);
  });

  it('rejects a future meeting outcome without inserting a protocol task or receipt', async () => {
    const harness = buildHarness();

    await expectCommandError(
      harness.service.createProtocolTask(
        userAuthContext(),
        protocolInput({
          kind: TeamWorkspaceProtocolTaskKind.MEETING_OUTCOME,
          content: 'The client agreed to review the proposal.',
          meetingOutcome: TeamWorkspaceMeetingOutcome.ATTENDED,
        }),
      ),
      TeamWorkspaceCommandExceptionCode.COMMAND_TIME_INVALID,
    );

    expect(harness.state.tasks.size).toBe(1);
    expect(harness.state.receipts.size).toBe(0);
  });

  it('lets Operations create a lane-wide verified client update with derived fields', async () => {
    const harness = buildHarness({ roleLabel: 'Operations' });
    const receipt = await harness.service.createProtocolTask(
      userAuthContext(),
      protocolInput({
        kind: TeamWorkspaceProtocolTaskKind.CLIENT_UPDATE,
        lane: TeamWorkspaceCommandLane.OPERATIONS,
        targetId: CLIENT_ID,
        content: 'The approved homepage is now on staging.',
        evidence: 'Staging URL checked against the approved scope.',
        source: 'CRM client record 88',
        idempotencyKey: 'client-update-0001',
      }),
    );
    const created = harness.state.tasks.get(receipt.sideEffectRecordId);

    expect(created).toMatchObject({
      title: 'Client update · acme · Acme Ltd',
      client: 'acme',
      status: 'DONE',
      workType: 'SOFTWARE',
    });
    expect(created?.bodyV2?.markdown).toContain(
      '**Verified update:** The approved homepage is now on staging.',
    );
  });

  it('transitions an unowned Operations task lane-wide and replays without another update', async () => {
    const otherMember = '99999999-9999-4999-8999-999999999999';
    const harness = buildHarness({
      roleLabel: 'Operations',
      initialTasks: [
        task({
          status: 'TODO',
          workType: 'SOFTWARE',
          assigneeId: otherMember,
          createdBy: { ...actor, workspaceMemberId: otherMember },
        }),
      ],
    });
    const input = transitionInput({
      expectedStatus: 'TODO',
      nextStatus: 'IN_PROGRESS',
    });
    const first = await harness.service.transitionTaskStatus(
      userAuthContext(),
      input,
    );

    expect(first).toMatchObject({
      command: 'transitionTaskStatus',
      resultState: 'IN_PROGRESS',
      replayed: false,
    });
    expect(harness.state.tasks.get(TASK_ID)?.status).toBe('IN_PROGRESS');

    await expect(
      harness.service.transitionTaskStatus(userAuthContext(), input),
    ).resolves.toEqual({ ...first, replayed: true });
  });

  it('rolls a task transition back when its optimistic update loses a race', async () => {
    const harness = buildHarness({ forceUpdateConflict: true });

    await expectCommandError(
      harness.service.transitionTaskStatus(
        userAuthContext(),
        transitionInput(),
      ),
      TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
    );

    expect(harness.state.tasks.get(TASK_ID)?.status).toBe('IN_PROGRESS');
    expect(harness.state.receipts.size).toBe(0);
  });

  it('matches PostgreSQL sub-millisecond versions through every command CAS path', async () => {
    const completion = buildHarness({
      initialTasks: [task({ updatedAt: SUB_MILLISECOND_VERSION })],
    });

    await expect(
      completion.service.completeTaskWithEvidence(
        userAuthContext(),
        completeInput(),
      ),
    ).resolves.toMatchObject({ resultState: 'DONE' });

    const handoff = buildHarness({
      initialOpportunities: [
        opportunity({ updatedAt: SUB_MILLISECOND_VERSION }),
      ],
    });

    await expect(
      handoff.service.winOpportunityWithHandoff(userAuthContext(), winInput()),
    ).resolves.toMatchObject({ resultState: 'CUSTOMER' });

    const taskTransition = buildHarness({
      initialTasks: [task({ updatedAt: SUB_MILLISECOND_VERSION })],
    });

    await expect(
      taskTransition.service.transitionTaskStatus(
        userAuthContext(),
        transitionInput(),
      ),
    ).resolves.toMatchObject({ resultState: 'TODO' });

    const opportunityTransition = buildHarness({
      initialOpportunities: [
        opportunity({ updatedAt: SUB_MILLISECOND_VERSION }),
      ],
    });

    await expect(
      opportunityTransition.service.updateOpportunityStage(
        userAuthContext(),
        stageInput(),
      ),
    ).resolves.toMatchObject({ resultState: 'NURTURE' });
  });

  it('excludes the next millisecond and atomically rejects every stale command CAS', async () => {
    const completion = buildHarness({
      initialTasks: [task({ updatedAt: SUB_MILLISECOND_VERSION })],
      updatedAtBeforeUpdate: NEXT_MILLISECOND_VERSION,
    });

    await expectCommandError(
      completion.service.completeTaskWithEvidence(
        userAuthContext(),
        completeInput(),
      ),
      TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
    );
    expect(completion.state.tasks.size).toBe(1);
    expect(completion.state.receipts.size).toBe(0);

    const handoff = buildHarness({
      initialOpportunities: [
        opportunity({ updatedAt: SUB_MILLISECOND_VERSION }),
      ],
      updatedAtBeforeUpdate: NEXT_MILLISECOND_VERSION,
    });

    await expectCommandError(
      handoff.service.winOpportunityWithHandoff(userAuthContext(), winInput()),
      TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
    );
    expect(handoff.state.opportunities.get(OPPORTUNITY_ID)?.stage).toBe(
      'DECISION',
    );
    expect(handoff.state.tasks.size).toBe(1);
    expect(handoff.state.tasks.has(OPPORTUNITY_ID)).toBe(false);
    expect(handoff.state.receipts.size).toBe(0);

    const taskTransition = buildHarness({
      initialTasks: [task({ updatedAt: SUB_MILLISECOND_VERSION })],
      updatedAtBeforeUpdate: NEXT_MILLISECOND_VERSION,
    });

    await expectCommandError(
      taskTransition.service.transitionTaskStatus(
        userAuthContext(),
        transitionInput(),
      ),
      TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
    );
    expect(taskTransition.state.tasks.get(TASK_ID)?.status).toBe('IN_PROGRESS');
    expect(taskTransition.state.receipts.size).toBe(0);

    const opportunityTransition = buildHarness({
      initialOpportunities: [
        opportunity({ updatedAt: SUB_MILLISECOND_VERSION }),
      ],
      updatedAtBeforeUpdate: NEXT_MILLISECOND_VERSION,
    });

    await expectCommandError(
      opportunityTransition.service.updateOpportunityStage(
        userAuthContext(),
        stageInput(),
      ),
      TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION,
    );
    expect(
      opportunityTransition.state.opportunities.get(OPPORTUNITY_ID)?.stage,
    ).toBe('DECISION');
    expect(opportunityTransition.state.receipts.size).toBe(0);
  });

  it('updates the shared Sales pipeline lane-wide and exactly replays it', async () => {
    const otherMember = '99999999-9999-4999-8999-999999999999';
    const harness = buildHarness({
      initialOpportunities: [opportunity({ ownerId: otherMember })],
    });
    const first = await harness.service.updateOpportunityStage(
      userAuthContext(),
      stageInput(),
    );

    expect(first).toMatchObject({
      command: 'updateOpportunityStage',
      resultState: 'NURTURE',
      replayed: false,
    });
    expect(harness.state.opportunities.get(OPPORTUNITY_ID)?.stage).toBe(
      'NURTURE',
    );

    await expect(
      harness.service.updateOpportunityStage(userAuthContext(), stageInput()),
    ).resolves.toEqual({ ...first, replayed: true });
  });

  it('rejects CUSTOMER on the simple stage command and rejects Operations pipeline writes', async () => {
    const sales = buildHarness();

    await expectCommandError(
      sales.service.updateOpportunityStage(userAuthContext(), {
        ...stageInput(),
        nextStage: 'CUSTOMER',
      } as unknown as UpdateTeamWorkspaceOpportunityStageInput),
      TeamWorkspaceCommandExceptionCode.INVALID_INPUT,
    );
    expect(sales.state.opportunities.get(OPPORTUNITY_ID)?.stage).toBe(
      'DECISION',
    );

    const operations = buildHarness({ roleLabel: 'Operations' });

    await expectCommandError(
      operations.service.updateOpportunityStage(
        userAuthContext(),
        stageInput(),
      ),
      TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
    );
    expect(
      operations.globalWorkspaceOrmManager.runInWorkspaceTransaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects Team Automation when it is misassigned to a human user', async () => {
    const harness = buildHarness({ roleLabel: 'Team Automation' });

    await expectCommandError(
      harness.service.createProtocolTask(userAuthContext(), protocolInput()),
      TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED,
    );
    expect(
      harness.globalWorkspaceOrmManager.runInWorkspaceTransaction,
    ).not.toHaveBeenCalled();
  });
});
