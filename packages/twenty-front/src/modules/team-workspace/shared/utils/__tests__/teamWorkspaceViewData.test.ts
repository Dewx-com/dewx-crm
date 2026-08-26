import {
  type TeamCalendarEventRecord,
  type TeamCallRecordingRecord,
  type TeamClientRecord,
  type TeamOpportunityRecord,
  type TeamTaskRecord,
  type TeamWorkspaceRecords,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';
import {
  buildOperationsWorkspaceData,
  buildSalesWorkspaceData,
  clientScopeFromWorkspaceId,
} from '@/team-workspace/shared/utils/teamWorkspaceViewData';

const NOW = new Date('2026-08-26T10:00:00.000Z');

const task = (overrides: Partial<TeamTaskRecord> = {}): TeamTaskRecord =>
  ({
    __typename: 'Task',
    id: 'task-1',
    title: 'Follow up with Acme',
    status: 'TODO',
    workType: 'OUTREACH',
    client: 'ACME',
    dueAt: '2026-08-27T10:00:00.000Z',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
    assignee: null,
    createdBy: {
      source: 'MANUAL',
      workspaceMemberId: 'fahim-1',
      name: 'Fahim',
    },
    ...overrides,
  }) as TeamTaskRecord;

const opportunity = (
  overrides: Partial<TeamOpportunityRecord> = {},
): TeamOpportunityRecord =>
  ({
    __typename: 'Opportunity',
    id: 'opportunity-1',
    name: 'Acme outbound',
    stage: 'MEETING',
    client: 'ACME',
    closeDate: null,
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
    owner: null,
    company: { id: 'company-1', name: 'Acme' },
    pointOfContact: {
      id: 'person-1',
      name: { firstName: 'Amina', lastName: 'Rahman' },
    },
    ...overrides,
  }) as TeamOpportunityRecord;

const meeting = (
  overrides: Partial<TeamCalendarEventRecord> = {},
): TeamCalendarEventRecord =>
  ({
    __typename: 'CalendarEvent',
    id: 'meeting-1',
    title: 'Discovery call',
    description: 'Confirm the problem and next commitment',
    startsAt: '2026-08-25T10:00:00.000Z',
    endsAt: '2026-08-25T10:30:00.000Z',
    isCanceled: false,
    isFullDay: false,
    conferenceLink: null,
    calendarEventParticipants: [
      {
        id: 'participant-1',
        displayName: 'Amina Rahman',
        handle: 'amina@example.com',
        isOrganizer: false,
        responseStatus: 'ACCEPTED',
        workspaceMember: null,
        person: {
          id: 'person-1',
          client: 'ACME',
          name: { firstName: 'Amina', lastName: 'Rahman' },
          company: { id: 'company-1', name: 'Acme' },
        },
      },
    ],
    ...overrides,
  }) as TeamCalendarEventRecord;

const client = (overrides: Partial<TeamClientRecord> = {}): TeamClientRecord =>
  ({
    __typename: 'Client',
    id: 'client-1',
    name: 'Acme',
    slug: 'acme',
    client: 'ACME',
    status: 'ACTIVE',
    ...overrides,
  }) as TeamClientRecord;

const records = (
  overrides: Partial<TeamWorkspaceRecords> = {},
): TeamWorkspaceRecords => ({
  tasks: [],
  opportunities: [],
  clients: [],
  meetings: [],
  callRecordings: [],
  handoffs: [],
  ...overrides,
});

describe('team workspace CRM adapter', () => {
  it('does not infer attendance from a past calendar event', () => {
    const sourceRecords = records({
      opportunities: [opportunity()],
      clients: [client()],
      meetings: [meeting()],
    });
    const data = buildSalesWorkspaceData({
      records: sourceRecords,
      salespersonName: 'Abrar',
      now: NOW,
      timeZone: 'Asia/Dhaka',
    });
    const operationsData = buildOperationsWorkspaceData({
      records: sourceRecords,
      viewer: { id: 'fahim-1', name: 'Fahim' },
      now: NOW,
    });

    expect(data.meetings[0]).toMatchObject({
      status: 'outcome-missing',
      contactName: 'Amina Rahman',
      companyName: 'Acme',
      opportunityId: 'opportunity-1',
    });
    expect(data.coachingReviews[0].transcriptStatus).toBe('missing');
    expect(operationsData.meetings[0]).toMatchObject({
      status: 'outcome-missing',
      participants: ['Amina Rahman'],
    });
  });

  it('uses a structured, attributed outcome for attended and no-show states', () => {
    const outcome = task({
      id: 'outcome-1',
      title: 'Meeting outcome · meeting-1 · Discovery call',
      status: 'DONE',
      bodyV2: {
        blocknote: null,
        markdown:
          '**Result:** No-show\n\n**Outcome:** Send two new times and confirm the decision owner.',
      },
    });
    const sourceRecords = records({
      tasks: [outcome],
      opportunities: [opportunity()],
      clients: [client()],
      meetings: [meeting()],
    });
    const salesData = buildSalesWorkspaceData({
      records: sourceRecords,
      salespersonName: 'Abrar',
      now: NOW,
    });
    const operationsData = buildOperationsWorkspaceData({
      records: sourceRecords,
      viewer: { id: 'fahim-1', name: 'Fahim' },
      now: NOW,
    });

    expect(salesData.meetings[0]).toMatchObject({
      status: 'no-show',
      outcome: 'Send two new times and confirm the decision owner.',
    });
    expect(operationsData.meetings[0]).toMatchObject({
      status: 'no-show',
      previousMeetingSummary:
        'Send two new times and confirm the decision owner.',
    });
  });

  it('requires body, source, creator, and done state before evidence is verified', () => {
    const originalTask = task({
      id: 'delivery-1',
      title: 'Publish campaign report',
      status: 'DONE',
    });
    const evidence = task({
      id: 'evidence-1',
      title: 'Completion evidence · delivery-1',
      status: 'DONE',
      bodyV2: {
        blocknote: null,
        markdown:
          '**Completion evidence:** Report published and client access tested.\n\nSource: CRM artifact #42',
      },
    });
    const verifiedUpdate = task({
      id: 'update-1',
      title: 'Client update · ACME · Report is live',
      status: 'DONE',
      bodyV2: {
        blocknote: null,
        markdown:
          '**Verified update:** Report is live\n\n**Evidence:** CRM artifact #42',
      },
    });
    const titleOnlyUpdate = task({
      id: 'update-2',
      title: 'Client update · ACME · Unsupported claim',
      status: 'DONE',
      bodyV2: null,
    });

    const data = buildOperationsWorkspaceData({
      records: records({
        clients: [client()],
        tasks: [originalTask, evidence, verifiedUpdate, titleOnlyUpdate],
      }),
      viewer: { id: 'fahim-1', name: 'Fahim' },
      now: NOW,
    });

    expect(data.tasks[0].completionEvidence).toMatchObject({
      summary: 'Report published and client access tested.',
      sourceRef: 'CRM artifact #42',
      recordedBy: 'Fahim',
    });
    expect(data.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'update-1',
          status: 'verified',
          verifiedBy: 'Fahim',
          evidenceRef: 'CRM artifact #42',
        }),
        expect.objectContaining({
          id: 'update-2',
          status: 'draft',
          verifiedBy: null,
          evidenceRef: null,
        }),
      ]),
    );
  });

  it('shows only recorded coaching evidence and a manually saved lesson', () => {
    const recording = {
      __typename: 'CallRecording',
      id: 'recording-1',
      title: 'Acme discovery',
      status: 'COMPLETED',
      startedAt: '2026-08-25T10:00:00.000Z',
      endedAt: '2026-08-25T10:30:00.000Z',
      createdAt: '2026-08-25T10:31:00.000Z',
      summary: { markdown: 'Amina confirmed the delivery bottleneck.' },
      transcriptStatus: 'available',
      evidenceReference: 'Local call evidence ref: recording-1',
      calendarEventId: 'meeting-1',
    } as TeamCallRecordingRecord;

    const data = buildSalesWorkspaceData({
      records: records({
        tasks: [
          task({
            id: 'lesson-1',
            title:
              'Coaching · recording-1 · Ask one follow-up before presenting the solution',
          }),
        ],
        clients: [client()],
        meetings: [meeting()],
        callRecordings: [recording],
      }),
      salespersonName: 'Abrar',
      now: NOW,
    });

    expect(data.coachingReviews[0]).toMatchObject({
      id: 'recording-1',
      transcriptStatus: 'available',
      summary: 'Amina confirmed the delivery bottleneck.',
      improvement: {
        title: 'Ask one follow-up before presenting the solution',
      },
    });
    expect(data.coachingReviews[0].evidence?.[0]).toEqual({
      id: 'recording-1-evidence',
      timestampLabel: 'Safe evidence reference',
      observation: 'Local call evidence ref: recording-1',
    });
    expect(data.coachingReviews[0].evidence?.[0].excerpt).toBeUndefined();
  });

  it('keeps an unclassified client honest and exposes the exact blocker', () => {
    const data = buildOperationsWorkspaceData({
      records: records({
        clients: [client({ status: null })],
        tasks: [
          task({
            id: 'blocker-1',
            title:
              'Blocked · original-task-1 · Waiting for the approved campaign brief',
            status: 'IN_PROGRESS',
          }),
        ],
      }),
      viewer: { id: 'fahim-1', name: 'Fahim' },
      now: NOW,
    });

    expect(data.clients[0]).toMatchObject({
      status: 'unknown',
      health: 'unknown',
    });
    expect(data.tasks[0]).toMatchObject({
      status: 'blocked',
      title: 'Blocked: Waiting for the approved campaign brief',
      blockedReason: 'Waiting for the approved campaign brief',
    });
  });

  it('keeps scoped client work visible before a directory row exists', () => {
    const data = buildOperationsWorkspaceData({
      records: records({
        tasks: [task({ client: 'NEW_CLIENT' })],
      }),
      viewer: { id: 'fahim-1', name: 'Fahim' },
      now: NOW,
    });

    expect(data.clients[0]).toMatchObject({
      id: 'scope:NEW_CLIENT',
      name: 'New Client',
      status: 'unknown',
    });
    expect(
      clientScopeFromWorkspaceId({
        clientId: data.clients[0].id,
        clients: [],
      }),
    ).toBe('NEW_CLIENT');
  });
});
