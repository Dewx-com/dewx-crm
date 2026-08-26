import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type TeamFullName = {
  firstName?: string | null;
  lastName?: string | null;
};

export type TeamTaskRecord = ObjectRecord & {
  id: string;
  title: string | null;
  bodyV2?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
  status: string | null;
  workType: string | null;
  client: string | null;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignee: { id: string; name: TeamFullName | null } | null;
  createdBy?: {
    source?: string | null;
    workspaceMemberId?: string | null;
    name?: string | null;
  } | null;
};

export type TeamOpportunityRecord = ObjectRecord & {
  id: string;
  name: string | null;
  stage: string | null;
  client: string | null;
  closeDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  owner: { id: string; name: TeamFullName | null } | null;
  company: { id: string; name: string | null } | null;
  pointOfContact: { id: string; name: TeamFullName | null } | null;
};

export type TeamClientRecord = ObjectRecord & {
  id: string;
  name: string | null;
  slug: string | null;
  client: string | null;
  status: string | null;
};

export type TeamCalendarParticipant = {
  id: string;
  displayName: string | null;
  handle: string | null;
  isOrganizer: boolean | null;
  responseStatus: string | null;
  person: {
    id: string;
    client: string | null;
    name: TeamFullName | null;
    company: { id: string; name: string | null } | null;
  } | null;
  workspaceMember: { id: string; name: TeamFullName | null } | null;
};

export type TeamCalendarEventRecord = ObjectRecord & {
  id: string;
  title: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isCanceled: boolean | null;
  isFullDay: boolean | null;
  conferenceLink: {
    primaryLinkLabel?: string | null;
    primaryLinkUrl?: string | null;
  } | null;
  calendarEventParticipants: TeamCalendarParticipant[] | null;
};

export type TeamCallRecordingRecord = ObjectRecord & {
  id: string;
  title: string | null;
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  summary: { markdown?: string | null } | null;
  transcriptStatus: 'available' | 'processing' | 'missing';
  evidenceReference: string | null;
  calendarEventId: string | null;
};

export type TeamWorkspaceRecords = {
  tasks: TeamTaskRecord[];
  opportunities: TeamOpportunityRecord[];
  clients: TeamClientRecord[];
  meetings: TeamCalendarEventRecord[];
  callRecordings: TeamCallRecordingRecord[];
  handoffs: TeamTaskRecord[];
};
