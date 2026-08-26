import { print } from 'graphql';

import {
  GET_TEAM_WORKSPACE_SNAPSHOT,
  type TeamWorkspaceSnapshot,
} from '@/team-workspace/shared/graphql/queries/getTeamWorkspaceSnapshot';
import { teamWorkspaceRecordsFromSnapshot } from '@/team-workspace/shared/utils/teamWorkspaceSnapshotAdapter';

const snapshot: TeamWorkspaceSnapshot = {
  lane: 'SALES',
  generatedAt: '2026-08-26T10:00:00.000Z',
  tasks: [
    {
      id: 'task-1',
      title: 'Meeting prep · meeting-1',
      status: 'DONE',
      workType: 'OUTREACH',
      clientScope: 'ACME',
      dueAt: '2026-08-26T09:00:00.000Z',
      createdAt: '2026-08-25T09:00:00.000Z',
      updatedAt: '2026-08-25T10:00:00.000Z',
      assigneeId: 'member-1',
      assigneeName: 'Abrar',
      bodyMarkdown: '**Preparation:** Confirm the decision process.',
      createdByName: 'Abrar',
    },
  ],
  handoffs: [],
  opportunities: [
    {
      id: 'opportunity-1',
      name: 'Acme outbound',
      stage: 'MEETING',
      clientScope: 'ACME',
      closeDate: null,
      createdAt: '2026-08-20T09:00:00.000Z',
      updatedAt: '2026-08-25T10:00:00.000Z',
      ownerId: 'member-1',
      ownerName: 'Abrar',
      companyId: 'company-1',
      companyName: 'Acme',
      pointOfContactId: 'person-1',
      pointOfContactName: 'Amina Rahman',
    },
  ],
  clients: [
    {
      id: 'client-1',
      name: 'Acme',
      slug: 'acme',
      clientScope: 'ACME',
      status: 'ACTIVE',
    },
  ],
  meetings: [
    {
      id: 'meeting-1',
      title: 'Discovery call',
      description: 'Confirm the problem',
      startsAt: '2026-08-26T09:00:00.000Z',
      endsAt: '2026-08-26T09:30:00.000Z',
      isCanceled: false,
      isFullDay: false,
      conferenceUrl: 'https://meet.example.test/acme',
      participants: [
        {
          id: 'participant-1',
          displayName: 'Amina Rahman',
          isOrganizer: false,
          responseStatus: 'ACCEPTED',
          personId: 'person-1',
          personName: 'Amina Rahman',
          clientScope: 'ACME',
          companyName: 'Acme',
          workspaceMemberId: null,
          workspaceMemberName: null,
        },
      ],
    },
  ],
  callRecordings: [
    {
      id: 'recording-1',
      title: 'Acme discovery',
      status: 'COMPLETED',
      startedAt: '2026-08-26T09:00:00.000Z',
      endedAt: '2026-08-26T09:30:00.000Z',
      createdAt: '2026-08-26T09:31:00.000Z',
      summaryMarkdown: 'Amina confirmed the delivery bottleneck.',
      transcriptStatus: 'AVAILABLE',
      evidenceReference: 'Local call evidence ref: recording-1',
      calendarEventId: 'meeting-1',
    },
  ],
};

describe('teamWorkspaceSnapshotAdapter', () => {
  it('maps the bounded server projection into the existing view records', () => {
    const records = teamWorkspaceRecordsFromSnapshot(snapshot);

    expect(records.tasks[0]).toMatchObject({
      client: 'ACME',
      assignee: { id: 'member-1', name: { firstName: 'Abrar' } },
      bodyV2: { markdown: '**Preparation:** Confirm the decision process.' },
      createdBy: { name: 'Abrar' },
    });
    expect(records.opportunities[0]).toMatchObject({
      owner: { id: 'member-1', name: { firstName: 'Abrar' } },
      pointOfContact: {
        id: 'person-1',
        name: { firstName: 'Amina Rahman' },
      },
    });
    expect(records.meetings[0]).toMatchObject({
      conferenceLink: {
        primaryLinkUrl: 'https://meet.example.test/acme',
      },
      calendarEventParticipants: [
        {
          person: {
            id: 'person-1',
            client: 'ACME',
            company: { name: 'Acme' },
          },
        },
      ],
    });
  });

  it('keeps raw transcript data outside the browser contract', () => {
    const recording =
      teamWorkspaceRecordsFromSnapshot(snapshot).callRecordings[0];

    expect(recording).toMatchObject({
      transcriptStatus: 'available',
      evidenceReference: 'Local call evidence ref: recording-1',
      summary: { markdown: 'Amina confirmed the delivery bottleneck.' },
    });
    expect(recording).not.toHaveProperty('transcript');
    expect(print(GET_TEAM_WORKSPACE_SNAPSHOT)).not.toMatch(/\btranscript\b/);
  });

  it('fails closed to an empty record set before a snapshot is available', () => {
    expect(teamWorkspaceRecordsFromSnapshot(undefined)).toEqual({
      tasks: [],
      handoffs: [],
      opportunities: [],
      clients: [],
      meetings: [],
      callRecordings: [],
    });
  });
});
