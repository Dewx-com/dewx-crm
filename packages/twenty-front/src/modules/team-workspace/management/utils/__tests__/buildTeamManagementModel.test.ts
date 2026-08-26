import { type TeamWorkspaceRecords } from '@/team-workspace/shared/types/TeamWorkspaceRecord';
import { buildTeamManagementModel } from '@/team-workspace/management/utils/buildTeamManagementModel';

const task = ({
  id,
  title,
  status = 'TODO',
  assigneeId = 'sales-member',
  dueAt = null,
  bodyMarkdown = null,
  createdAt = '2026-08-20T09:00:00.000Z',
}: {
  id: string;
  title: string;
  status?: string;
  assigneeId?: string | null;
  dueAt?: string | null;
  bodyMarkdown?: string | null;
  createdAt?: string;
}) =>
  ({
    __typename: 'Task',
    id,
    title,
    status,
    workType: assigneeId === 'operations-member' ? 'SOFTWARE' : 'OUTREACH',
    client: 'client-one',
    dueAt,
    createdAt,
    updatedAt: createdAt,
    assignee: assigneeId
      ? {
          id: assigneeId,
          name: { firstName: assigneeId, lastName: null },
        }
      : null,
    bodyV2: bodyMarkdown ? { blocknote: null, markdown: bodyMarkdown } : null,
    createdBy: {
      source: 'MANUAL',
      workspaceMemberId: assigneeId,
      name: assigneeId,
    },
  }) as TeamWorkspaceRecords['tasks'][number];

const emptyRecords = (): TeamWorkspaceRecords => ({
  tasks: [],
  handoffs: [],
  opportunities: [],
  clients: [
    {
      __typename: 'Client',
      id: 'client-record',
      name: 'Client One',
      slug: 'client-one',
      client: 'client-one',
      status: 'Active',
    },
  ],
  meetings: [],
  callRecordings: [],
});

describe('buildTeamManagementModel', () => {
  it('builds factual employee attention counts, evidence, and next actions', () => {
    const salesRecords = emptyRecords();
    const operationsRecords = emptyRecords();

    salesRecords.tasks = [
      task({
        id: 'overdue-follow-up',
        title: 'Follow up on proposal',
        dueAt: '2026-08-25T09:00:00.000Z',
      }),
      task({
        id: 'completed-with-evidence',
        title: 'Send agreed scope',
        status: 'DONE',
      }),
      task({
        id: 'completed-with-evidence-record',
        title: 'Completion evidence · completed-with-evidence',
        status: 'DONE',
        bodyMarkdown:
          '**Completion evidence:** Scope sent to the client.\n\nSource: CRM activity 42',
        createdAt: '2026-08-25T11:00:00.000Z',
      }),
      task({
        id: 'completed-without-evidence',
        title: 'Confirm decision owner',
        status: 'DONE',
      }),
    ];
    operationsRecords.tasks = [
      task({
        id: 'blocked-work',
        title: 'Blocked · delivery-task · Waiting for access',
        assigneeId: 'operations-member',
        dueAt: '2026-08-27T09:00:00.000Z',
      }),
      task({
        id: 'client-promise',
        title: 'Promise · Send verified campaign update',
        assigneeId: 'operations-member',
        dueAt: '2026-08-28T09:00:00.000Z',
      }),
      task({
        id: 'unassigned-work',
        title: 'Prepare campaign source list',
        assigneeId: null,
      }),
    ];

    const model = buildTeamManagementModel({
      generatedAt: '2026-08-26T12:00:00.000Z',
      members: [
        { id: 'sales-member', name: 'Sales Member', lane: 'SALES' },
        {
          id: 'operations-member',
          name: 'Operations Member',
          lane: 'OPERATIONS',
        },
      ],
      salesRecords,
      operationsRecords,
      now: new Date('2026-08-26T12:00:00.000Z'),
    });

    expect(model.employees[0]).toMatchObject({
      attention: 'needs-attention',
      counts: {
        assigned: 3,
        open: 1,
        done: 2,
        evidenceGaps: 1,
        overdue: 1,
        blockers: 0,
        promises: 0,
      },
      nextFollowUp: { id: 'overdue-follow-up' },
      latestEvidence: {
        taskId: 'completed-with-evidence',
        summary: 'Scope sent to the client.',
        source: 'CRM activity 42',
      },
    });
    expect(model.employees[1]).toMatchObject({
      attention: 'needs-attention',
      counts: {
        assigned: 2,
        open: 2,
        done: 0,
        evidenceGaps: 0,
        overdue: 0,
        blockers: 1,
        promises: 1,
      },
      nextFollowUp: { id: 'blocked-work' },
    });
    expect(model.unassignedOperations.map(({ id }) => id)).toEqual([
      'unassigned-work',
    ]);
  });

  it('keeps next meetings and coaching evidence scoped to the exact member id', () => {
    const salesRecords = emptyRecords();
    const operationsRecords = emptyRecords();

    salesRecords.tasks = [
      task({
        id: 'coaching-task',
        title: 'Coaching · recording-one · Discovery call',
        bodyMarkdown:
          '**Improvement:** Confirm the decision process before proposing.\n\n**Evidence:** Call recording recording-one summary\n\n**Source:** Call recording recording-one summary',
      }),
    ];
    salesRecords.meetings = [
      {
        __typename: 'CalendarEvent',
        id: 'upcoming-meeting',
        title: 'Proposal review',
        description: null,
        startsAt: '2026-08-27T10:00:00.000Z',
        endsAt: '2026-08-27T10:30:00.000Z',
        isCanceled: false,
        isFullDay: false,
        conferenceLink: null,
        calendarEventParticipants: [
          {
            id: 'participant-upcoming',
            displayName: 'Sales Member',
            handle: null,
            isOrganizer: true,
            responseStatus: 'ACCEPTED',
            person: null,
            workspaceMember: {
              id: 'sales-member',
              name: { firstName: 'Sales', lastName: 'Member' },
            },
          },
        ],
      },
      {
        __typename: 'CalendarEvent',
        id: 'recent-meeting',
        title: 'Discovery call',
        description: null,
        startsAt: '2026-08-25T10:00:00.000Z',
        endsAt: '2026-08-25T10:30:00.000Z',
        isCanceled: false,
        isFullDay: false,
        conferenceLink: null,
        calendarEventParticipants: [
          {
            id: 'participant-recent',
            displayName: 'Sales Member',
            handle: null,
            isOrganizer: true,
            responseStatus: 'ACCEPTED',
            person: null,
            workspaceMember: {
              id: 'sales-member',
              name: { firstName: 'Sales', lastName: 'Member' },
            },
          },
        ],
      },
    ];
    salesRecords.callRecordings = [
      {
        __typename: 'CallRecording',
        id: 'recording-one',
        title: 'Discovery call',
        status: 'DONE',
        startedAt: '2026-08-25T10:00:00.000Z',
        endedAt: '2026-08-25T10:30:00.000Z',
        createdAt: '2026-08-25T10:31:00.000Z',
        summary: { markdown: 'The prospect described the buying process.' },
        transcriptStatus: 'available',
        evidenceReference: 'Call recording recording-one summary',
        calendarEventId: 'recent-meeting',
      },
    ];

    const model = buildTeamManagementModel({
      generatedAt: '2026-08-26T12:00:00.000Z',
      members: [{ id: 'sales-member', name: 'Sales Member', lane: 'SALES' }],
      salesRecords,
      operationsRecords,
      now: new Date('2026-08-26T12:00:00.000Z'),
    });

    expect(model.employees[0].nextMeeting).toMatchObject({
      id: 'upcoming-meeting',
      title: 'Proposal review',
    });
    expect(model.employees[0].coachingNote).toEqual({
      title: 'Confirm the decision process before proposing.',
      detail: 'The prospect described the buying process.',
      evidenceReference: 'Call recording recording-one summary',
    });
  });

  it('associates completion evidence by the exact referenced task id', () => {
    const salesRecords = emptyRecords();

    salesRecords.tasks = [
      task({
        id: 'task-one',
        title: 'Send scope',
        status: 'DONE',
      }),
      task({
        id: 'evidence-for-another-task',
        title: 'Completion evidence · prefix-task-one',
        status: 'DONE',
        bodyMarkdown:
          '**Completion evidence:** Other work delivered.\n\nSource: CRM activity 99',
      }),
    ];

    const model = buildTeamManagementModel({
      generatedAt: '2026-08-26T12:00:00.000Z',
      members: [{ id: 'sales-member', name: 'Sales Member', lane: 'SALES' }],
      salesRecords,
      operationsRecords: emptyRecords(),
      now: new Date('2026-08-26T12:00:00.000Z'),
    });

    expect(model.employees[0].counts.evidenceGaps).toBe(1);
    expect(model.employees[0].latestEvidence).toBeNull();
  });
});
