import {
  type SalesWorkspaceCallbacks,
  type SalesWorkspaceData,
} from '@/team-workspace/sales/types/sales-workspace.types';
import { type SalesWorkspaceModel } from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import { SalesLatestCallCard } from '@/team-workspace/sales/components/SalesLatestCallCard';
import { SalesNextMeetingCard } from '@/team-workspace/sales/components/SalesNextMeetingCard';
import {
  SalesOverdueFollowUpsCard,
  SalesUpcomingMeetingsCard,
} from '@/team-workspace/sales/components/SalesTodayListCards';
import {
  SalesSectionHeading,
  StyledSalesSection,
  StyledSectionGrid,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

type SalesTodaySectionProps = Pick<
  SalesWorkspaceCallbacks,
  'onPrepareMeeting' | 'onOpenRecord'
> & {
  data: SalesWorkspaceData;
  model: SalesWorkspaceModel;
  now: string;
};

export const SalesTodaySection = ({
  data,
  model,
  now,
  onPrepareMeeting,
  onOpenRecord,
}: SalesTodaySectionProps) => {
  return (
    <StyledSalesSection aria-labelledby="sales-today-heading">
      <SalesSectionHeading
        id="sales-today-heading"
        eyebrow={`${data.salespersonName}'s sales workspace`}
        title="Today"
        description="Prepare the next call and clear late follow-ups. Carry the last useful lesson into the next conversation."
      />

      <StyledSectionGrid>
        <SalesNextMeetingCard
          meeting={model.nextMeeting}
          now={now}
          onPrepareMeeting={onPrepareMeeting}
          onOpenRecord={onOpenRecord}
        />
        <SalesLatestCallCard
          review={model.latestCoachingReview}
          onOpenRecord={onOpenRecord}
        />
        <SalesOverdueFollowUpsCard
          followUps={model.overdueFollowUps}
          onOpenRecord={onOpenRecord}
        />
        <SalesUpcomingMeetingsCard meetings={model.upcomingMeetings} />
      </StyledSectionGrid>
    </StyledSalesSection>
  );
};
