import {
  type SalesMeetingKind,
  type SalesMeetingStatus,
  type SalesOpportunityStage,
} from '@/team-workspace/sales/types/sales-workspace.types';

const SALES_MEETING_KIND_LABELS: Record<SalesMeetingKind, string> = {
  discovery: 'Discovery',
  qualification: 'Qualification',
  proposal: 'Proposal',
  'follow-up': 'Follow-up',
};

const SALES_MEETING_STATUS_LABELS: Record<SalesMeetingStatus, string> = {
  scheduled: 'Scheduled',
  prepared: 'Prepared',
  attended: 'Attended',
  'outcome-missing': 'Outcome missing',
  'no-show': 'No-show',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
};

const SALES_OPPORTUNITY_STAGE_LABELS: Record<SalesOpportunityStage, string> = {
  new: 'New',
  discovery: 'Discovery',
  qualified: 'Qualified',
  proposal: 'Proposal',
  decision: 'Decision',
  won: 'Won',
  lost: 'Lost',
  nurture: 'Nurture',
  dnc: 'Do not contact',
};

export const getSalesMeetingKindLabel = (kind: SalesMeetingKind) =>
  SALES_MEETING_KIND_LABELS[kind];

export const getSalesMeetingStatusLabel = (status: SalesMeetingStatus) =>
  SALES_MEETING_STATUS_LABELS[status];

export const getSalesOpportunityStageLabel = (stage: SalesOpportunityStage) =>
  SALES_OPPORTUNITY_STAGE_LABELS[stage];
