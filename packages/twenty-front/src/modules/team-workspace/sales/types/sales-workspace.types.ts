export const SALES_WORKSPACE_SECTIONS = [
  'today',
  'meetings',
  'pipeline',
  'call-coaching',
] as const;

export type SalesWorkspaceSection = (typeof SALES_WORKSPACE_SECTIONS)[number];

export type SalesMeetingStatus =
  | 'scheduled'
  | 'prepared'
  | 'attended'
  | 'outcome-missing'
  | 'no-show'
  | 'rescheduled'
  | 'cancelled';

export type SalesMeetingKind =
  | 'discovery'
  | 'qualification'
  | 'proposal'
  | 'follow-up';

export type SalesPreparationStatus = 'not-started' | 'in-progress' | 'ready';

export type SalesOpportunityStage =
  | 'new'
  | 'discovery'
  | 'qualified'
  | 'proposal'
  | 'decision'
  | 'won'
  | 'lost'
  | 'nurture'
  | 'dnc';

export type SalesFollowUpStatus = 'todo' | 'in-progress' | 'done';

export type SalesTranscriptStatus = 'available' | 'processing' | 'missing';

export type SalesMeeting = {
  id: string;
  contactName: string;
  companyName: string;
  startsAt: string;
  durationMinutes: number;
  timezoneLabel: string;
  kind: SalesMeetingKind;
  status: SalesMeetingStatus;
  preparationStatus: SalesPreparationStatus;
  preparationSummary?: string;
  opportunityId?: string;
  outcome?: string;
};

export type SalesOpportunity = {
  id: string;
  contactName: string;
  companyName: string;
  stage: SalesOpportunityStage;
  nextAction?: string;
  nextActionDueAt?: string;
};

export type SalesFollowUp = {
  id: string;
  title: string;
  detail: string | null;
  companyName: string;
  dueAt: string;
  status: SalesFollowUpStatus;
  opportunityId?: string;
};

export type SalesTaskStatusChange = {
  taskId: string;
  status: SalesFollowUpStatus;
};

export type SalesCoachingEvidence = {
  id: string;
  timestampLabel: string;
  observation: string;
  excerpt?: string;
};

export type SalesCoachingReview = {
  id: string;
  meetingId: string;
  contactName: string;
  companyName: string;
  occurredAt: string;
  transcriptStatus: SalesTranscriptStatus;
  summary?: string;
  score?: number;
  strengths?: string[];
  improvement?: {
    title: string;
    detail?: string;
  };
  evidence?: SalesCoachingEvidence[];
};

export type SalesWorkspaceData = {
  salespersonName: string;
  meetings: SalesMeeting[];
  opportunities: SalesOpportunity[];
  followUps: SalesFollowUp[];
  coachingReviews: SalesCoachingReview[];
};

export type SalesRecordReference =
  | { recordType: 'meeting'; recordId: string }
  | { recordType: 'opportunity'; recordId: string }
  | { recordType: 'follow-up'; recordId: string };

export type SalesWorkspaceCallbacks = {
  onPrepareMeeting: (meetingId: string) => void;
  onCompleteMeeting: (meetingId: string) => void;
  onUpdateOpportunity: (opportunityId: string) => void;
  onOpenRecord: (record: SalesRecordReference) => void;
  onTaskStatusChange?: (change: SalesTaskStatusChange) => void;
  onRecordCoachingLesson?: (reviewId: string) => void;
};

export type SalesWorkspaceProps = SalesWorkspaceCallbacks & {
  section: SalesWorkspaceSection;
  data: SalesWorkspaceData;
  now?: string;
};
