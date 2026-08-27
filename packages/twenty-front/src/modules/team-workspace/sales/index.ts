export { SalesCallCoachingSection } from '@/team-workspace/sales/components/SalesCallCoachingSection';
export { SalesCoachingReviewCard } from '@/team-workspace/sales/components/SalesCoachingReviewCard';
export { SalesMeetingsSection } from '@/team-workspace/sales/components/SalesMeetingsSection';
export { SalesPipelineSection } from '@/team-workspace/sales/components/SalesPipelineSection';
export { SalesTodaySection } from '@/team-workspace/sales/components/SalesTodaySection';
export { SalesWorkspace } from '@/team-workspace/sales/components/SalesWorkspace';

export {
  SALES_WORKSPACE_SECTIONS,
  type SalesCoachingEvidence,
  type SalesCoachingReview,
  type SalesFollowUp,
  type SalesFollowUpStatus,
  type SalesTaskStatusChange,
  type SalesMeeting,
  type SalesMeetingKind,
  type SalesMeetingStatus,
  type SalesOpportunity,
  type SalesOpportunityStage,
  type SalesPreparationStatus,
  type SalesRecordReference,
  type SalesTranscriptStatus,
  type SalesWorkspaceCallbacks,
  type SalesWorkspaceData,
  type SalesWorkspaceProps,
  type SalesWorkspaceSection,
} from '@/team-workspace/sales/types/sales-workspace.types';

export {
  buildSalesPipelineRows,
  buildSalesWorkspaceModel,
  formatSalesDateTime,
  formatSalesRelativeTime,
  getSalesCoachingAvailability,
  type SalesCoachingAvailability,
  type SalesPipelineRow,
  type SalesWorkspaceModel,
} from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
