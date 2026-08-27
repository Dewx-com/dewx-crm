import { SalesCallCoachingSection } from '@/team-workspace/sales/components/SalesCallCoachingSection';
import { SalesMeetingsSection } from '@/team-workspace/sales/components/SalesMeetingsSection';
import { SalesPipelineSection } from '@/team-workspace/sales/components/SalesPipelineSection';
import { SalesTodaySection } from '@/team-workspace/sales/components/SalesTodaySection';
import { type SalesWorkspaceProps } from '@/team-workspace/sales/types/sales-workspace.types';
import { buildSalesWorkspaceModel } from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';

export const SalesWorkspace = ({
  section,
  data,
  now: providedNow,
  onPrepareMeeting,
  onCompleteMeeting,
  onUpdateOpportunity,
  onOpenRecord,
  onTaskStatusChange,
  onRecordCoachingLesson,
}: SalesWorkspaceProps) => {
  const now = providedNow ?? new Date().toISOString();
  const model = buildSalesWorkspaceModel(data, now);

  if (section === 'today') {
    return (
      <SalesTodaySection
        data={data}
        model={model}
        now={now}
        onPrepareMeeting={onPrepareMeeting}
        onOpenRecord={onOpenRecord}
        onTaskStatusChange={onTaskStatusChange}
      />
    );
  }

  if (section === 'meetings') {
    return (
      <SalesMeetingsSection
        data={data}
        model={model}
        onPrepareMeeting={onPrepareMeeting}
        onCompleteMeeting={onCompleteMeeting}
        onOpenRecord={onOpenRecord}
      />
    );
  }

  if (section === 'pipeline') {
    return (
      <SalesPipelineSection
        model={model}
        onUpdateOpportunity={onUpdateOpportunity}
        onOpenRecord={onOpenRecord}
      />
    );
  }

  return (
    <SalesCallCoachingSection
      data={data}
      model={model}
      onOpenRecord={onOpenRecord}
      onRecordCoachingLesson={onRecordCoachingLesson}
    />
  );
};
