import { TEAM_RECORD_PREFIX } from '@/team-workspace/shared/constants/teamWorkspaceRecordConventions';
import {
  clientOfMeeting,
  isOverdueTask,
  latestMeetingForOpportunity,
  prepTaskOfMeeting,
  recordingOfMeeting,
  upcomingMeetingsOf,
} from '@/team-workspace/shared/utils/teamWorkspaceRecordModel';
import {
  type TeamCalendarEventRecord,
  type TeamCallRecordingRecord,
  type TeamOpportunityRecord,
  type TeamTaskRecord,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';

const task = (overrides: Partial<TeamTaskRecord> = {}): TeamTaskRecord =>
  ({
    id: 'task-1',
    title: 'Follow up · Example',
    status: 'TODO',
    workType: 'OUTREACH',
    client: 'EXAMPLE',
    dueAt: '2026-08-25T09:00:00.000Z',
    createdAt: '2026-08-24T09:00:00.000Z',
    updatedAt: '2026-08-24T09:00:00.000Z',
    assignee: null,
    ...overrides,
  }) as TeamTaskRecord;

const meeting = (
  overrides: Partial<TeamCalendarEventRecord> = {},
): TeamCalendarEventRecord =>
  ({
    id: 'meeting-1',
    title: 'Discovery call',
    description: null,
    startsAt: '2026-08-27T09:00:00.000Z',
    endsAt: '2026-08-27T09:30:00.000Z',
    isCanceled: false,
    isFullDay: false,
    conferenceLink: null,
    calendarEventParticipants: [],
    ...overrides,
  }) as TeamCalendarEventRecord;

describe('teamWorkspaceRecordModel', () => {
  it('keeps completed work out of the overdue queue', () => {
    const now = new Date('2026-08-26T09:00:00.000Z').getTime();

    expect(isOverdueTask(task(), now)).toBe(true);
    expect(isOverdueTask(task({ status: 'DONE' }), now)).toBe(false);
  });

  it('matches meeting prep by the stable meeting id', () => {
    const prep = task({
      title: `${TEAM_RECORD_PREFIX.meetingPrep} meeting-1 · Discovery call`,
    });

    expect(prepTaskOfMeeting(meeting(), [prep])?.id).toBe(prep.id);
  });

  it('derives the client only from an attached participant record', () => {
    const row = meeting({
      calendarEventParticipants: [
        {
          id: 'participant-1',
          displayName: 'Client contact',
          handle: 'contact@example.com',
          isOrganizer: false,
          responseStatus: 'ACCEPTED',
          person: {
            id: 'person-1',
            client: 'EXAMPLE',
            name: { firstName: 'Client', lastName: 'Contact' },
            company: { id: 'company-1', name: 'Example' },
          },
          workspaceMember: null,
        },
      ],
    });

    expect(clientOfMeeting(row)).toBe('EXAMPLE');
  });

  it('orders future meetings and ignores canceled ones', () => {
    const rows = upcomingMeetingsOf(
      [
        meeting({ id: 'later', startsAt: '2026-08-28T09:00:00.000Z' }),
        meeting({ id: 'first', startsAt: '2026-08-27T09:00:00.000Z' }),
        meeting({ id: 'canceled', isCanceled: true }),
      ],
      new Date('2026-08-26T09:00:00.000Z').getTime(),
    );

    expect(rows.map((row) => row.id)).toEqual(['first', 'later']);
  });

  it('uses only the recording attached to that meeting', () => {
    const recordings = [
      {
        id: 'other',
        calendarEventId: 'meeting-2',
        startedAt: '2026-08-27T10:00:00.000Z',
      },
      {
        id: 'right',
        calendarEventId: 'meeting-1',
        startedAt: '2026-08-27T09:00:00.000Z',
      },
    ] as TeamCallRecordingRecord[];

    expect(recordingOfMeeting(meeting(), recordings)?.id).toBe('right');
  });

  it('does not attach an unrelated meeting to a deal', () => {
    const opportunity = {
      id: 'opportunity-1',
      name: 'Example deal',
      client: 'EXAMPLE',
      company: { id: 'company-1', name: 'Example' },
    } as TeamOpportunityRecord;

    expect(
      latestMeetingForOpportunity({
        opportunity,
        meetings: [meeting({ startsAt: '2026-08-25T09:00:00.000Z' })],
        now: new Date('2026-08-26T09:00:00.000Z').getTime(),
      }),
    ).toBeNull();
  });
});
