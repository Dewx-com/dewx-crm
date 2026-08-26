import { TEAM_RECORD_PREFIX } from '@/team-workspace/shared/constants/teamWorkspaceRecordConventions';
import {
  type TeamCalendarEventRecord,
  type TeamCallRecordingRecord,
  type TeamClientRecord,
  type TeamFullName,
  type TeamOpportunityRecord,
  type TeamTaskRecord,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';

export const compactText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

export const fullName = (name: TeamFullName | null | undefined): string =>
  compactText(`${name?.firstName ?? ''} ${name?.lastName ?? ''}`);

export const normalKey = (value: string | null | undefined): string =>
  compactText(value).toLowerCase();

export const isDoneTask = (task: TeamTaskRecord): boolean =>
  normalKey(task.status) === 'done';

export const hasRecordPrefix = (
  task: TeamTaskRecord,
  prefix: string,
): boolean => normalKey(task.title).startsWith(normalKey(prefix));

export const isOverdueTask = (
  task: TeamTaskRecord,
  now: number = Date.now(),
): boolean => {
  if (isDoneTask(task) || !task.dueAt) return false;
  const dueAt = new Date(task.dueAt).getTime();
  return Number.isFinite(dueAt) && dueAt < now;
};

export const clientOfMeeting = (
  meeting: TeamCalendarEventRecord,
): string | null => {
  const values = (meeting.calendarEventParticipants ?? [])
    .map((participant) => participant.person?.client ?? null)
    .filter((value): value is string => Boolean(value));

  return values[0] ?? null;
};

export const companyOfMeeting = (
  meeting: TeamCalendarEventRecord,
): string | null => {
  const value = (meeting.calendarEventParticipants ?? []).find(
    (participant) => compactText(participant.person?.company?.name) !== '',
  )?.person?.company?.name;

  return compactText(value) || null;
};

export const contactOfMeeting = (
  meeting: TeamCalendarEventRecord,
): string | null => {
  const externalParticipant = (meeting.calendarEventParticipants ?? []).find(
    (participant) => participant.workspaceMember === null,
  );

  return (
    compactText(externalParticipant?.displayName) ||
    fullName(externalParticipant?.person?.name) ||
    compactText(externalParticipant?.handle) ||
    null
  );
};

const taskMentionsMeeting = (
  task: TeamTaskRecord,
  meeting: TeamCalendarEventRecord,
): boolean => {
  const title = normalKey(task.title);
  return (
    title.includes(normalKey(meeting.id)) ||
    (compactText(meeting.title) !== '' &&
      title.includes(normalKey(meeting.title)))
  );
};

export const prepTaskOfMeeting = (
  meeting: TeamCalendarEventRecord,
  tasks: TeamTaskRecord[],
): TeamTaskRecord | null =>
  tasks.find(
    (task) =>
      hasRecordPrefix(task, TEAM_RECORD_PREFIX.meetingPrep) &&
      taskMentionsMeeting(task, meeting),
  ) ?? null;

export const outcomeTaskOfMeeting = (
  meeting: TeamCalendarEventRecord,
  tasks: TeamTaskRecord[],
): TeamTaskRecord | null =>
  tasks.find(
    (task) =>
      hasRecordPrefix(task, TEAM_RECORD_PREFIX.meetingOutcome) &&
      taskMentionsMeeting(task, meeting),
  ) ?? null;

export const recordingOfMeeting = (
  meeting: TeamCalendarEventRecord,
  callRecordings: TeamCallRecordingRecord[],
): TeamCallRecordingRecord | null =>
  callRecordings
    .filter((recording) => recording.calendarEventId === meeting.id)
    .sort((left, right) =>
      (right.startedAt ?? right.createdAt ?? '').localeCompare(
        left.startedAt ?? left.createdAt ?? '',
      ),
    )[0] ?? null;

export const upcomingMeetingsOf = (
  meetings: TeamCalendarEventRecord[],
  now: number = Date.now(),
): TeamCalendarEventRecord[] =>
  meetings
    .filter((meeting) => {
      const startsAt = meeting.startsAt
        ? new Date(meeting.startsAt).getTime()
        : Number.NaN;
      return (
        !meeting.isCanceled && Number.isFinite(startsAt) && startsAt >= now
      );
    })
    .sort((left, right) =>
      (left.startsAt ?? '').localeCompare(right.startsAt ?? ''),
    );

export const recentMeetingsOf = (
  meetings: TeamCalendarEventRecord[],
  now: number = Date.now(),
): TeamCalendarEventRecord[] =>
  meetings
    .filter((meeting) => {
      const startsAt = meeting.startsAt
        ? new Date(meeting.startsAt).getTime()
        : Number.NaN;
      return !meeting.isCanceled && Number.isFinite(startsAt) && startsAt < now;
    })
    .sort((left, right) =>
      (right.startsAt ?? '').localeCompare(left.startsAt ?? ''),
    );

export const nextTaskForClient = (
  tasks: TeamTaskRecord[],
  client: string,
): TeamTaskRecord | null =>
  tasks
    .filter((task) => task.client === client && !isDoneTask(task))
    .sort((left, right) => {
      if (!left.dueAt) return 1;
      if (!right.dueAt) return -1;
      return left.dueAt.localeCompare(right.dueAt);
    })[0] ?? null;

export const lastVerifiedUpdateForClient = (
  tasks: TeamTaskRecord[],
  client: string,
): TeamTaskRecord | null =>
  tasks
    .filter(
      (task) =>
        task.client === client &&
        hasRecordPrefix(task, TEAM_RECORD_PREFIX.clientUpdate) &&
        isDoneTask(task),
    )
    .sort((left, right) =>
      (right.updatedAt ?? right.createdAt ?? '').localeCompare(
        left.updatedAt ?? left.createdAt ?? '',
      ),
    )[0] ?? null;

export const latestMeetingForOpportunity = ({
  opportunity,
  meetings,
  now = Date.now(),
}: {
  opportunity: TeamOpportunityRecord;
  meetings: TeamCalendarEventRecord[];
  now?: number;
}): TeamCalendarEventRecord | null => {
  const client = normalKey(opportunity.client);
  const company = normalKey(opportunity.company?.name);

  return (
    recentMeetingsOf(meetings, now).find((meeting) => {
      const meetingClient = normalKey(clientOfMeeting(meeting));
      const meetingCompany = normalKey(companyOfMeeting(meeting));
      return (
        (client !== '' && meetingClient === client) ||
        (company !== '' && meetingCompany === company)
      );
    }) ?? null
  );
};

export const clientNameMapOf = (
  clients: TeamClientRecord[],
): Map<string, string> =>
  new Map(
    clients.flatMap((client) => {
      const scope = compactText(client.client);
      if (!scope) return [];
      return [[scope, compactText(client.name) || scope] as const];
    }),
  );
