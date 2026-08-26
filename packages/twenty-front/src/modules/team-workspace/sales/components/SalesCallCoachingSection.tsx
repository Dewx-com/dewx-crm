import {
  type SalesWorkspaceCallbacks,
  type SalesWorkspaceData,
} from '@/team-workspace/sales/types/sales-workspace.types';
import { type SalesWorkspaceModel } from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import { SalesCoachingReviewCard } from '@/team-workspace/sales/components/SalesCoachingReviewCard';
import {
  SalesEmptyState,
  SalesSectionHeading,
  StyledSalesSection,
  StyledStack,
  StyledSurface,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

type SalesCallCoachingSectionProps = Pick<
  SalesWorkspaceCallbacks,
  'onOpenRecord' | 'onRecordCoachingLesson'
> & {
  data: SalesWorkspaceData;
  model: SalesWorkspaceModel;
};

export const SalesCallCoachingSection = ({
  data,
  model,
  onOpenRecord,
  onRecordCoachingLesson,
}: SalesCallCoachingSectionProps) => {
  return (
    <StyledSalesSection aria-labelledby="sales-coaching-heading">
      <SalesSectionHeading
        id="sales-coaching-heading"
        eyebrow={`${data.salespersonName}'s call reviews`}
        title="Call coaching"
        description="Coaching appears only when a supplied transcript and cited call evidence support it."
      />

      {model.coachingReviews.length > 0 ? (
        <StyledStack>
          {model.coachingReviews.map((review) => (
            <SalesCoachingReviewCard
              key={review.id}
              review={review}
              onOpenMeeting={(meetingId) =>
                onOpenRecord({ recordType: 'meeting', recordId: meetingId })
              }
              onRecordLesson={onRecordCoachingLesson}
            />
          ))}
        </StyledStack>
      ) : (
        <StyledSurface>
          <SalesEmptyState
            title="No call reviews yet"
            detail="Reviews will appear after a completed call has transcript evidence."
          />
        </StyledSurface>
      )}
    </StyledSalesSection>
  );
};
