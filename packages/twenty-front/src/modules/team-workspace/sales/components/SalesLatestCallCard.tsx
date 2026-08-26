import { styled } from '@linaria/react';
import { IconSparkles } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type SalesCoachingReview,
  type SalesWorkspaceCallbacks,
} from '@/team-workspace/sales/types/sales-workspace.types';
import {
  formatSalesDateTime,
  getSalesCoachingAvailability,
} from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import {
  SalesEmptyState,
  SalesRecordButton,
  SalesStatusPill,
  StyledMutedText,
  StyledStack,
  StyledSurface,
  StyledSurfaceBody,
  StyledSurfaceHeader,
  StyledSurfaceTitle,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

const StyledPanel = styled(StyledSurface)`
  grid-column: span 4;

  @media (max-width: 840px) {
    grid-column: 1 / -1;
  }
`;

const StyledFocus = styled.div`
  background: ${themeCssVariables.background.transparent.blue};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.55;
  padding: ${themeCssVariables.spacing[4]};
`;

type SalesLatestCallCardProps = Pick<
  SalesWorkspaceCallbacks,
  'onOpenRecord'
> & {
  review?: SalesCoachingReview;
};

export const SalesLatestCallCard = ({
  review,
  onOpenRecord,
}: SalesLatestCallCardProps) => {
  const availability = review
    ? getSalesCoachingAvailability(review)
    : undefined;

  return (
    <StyledPanel>
      <StyledSurfaceHeader>
        <StyledSurfaceTitle>Last call improvement</StyledSurfaceTitle>
        <IconSparkles
          size={16}
          color={themeCssVariables.color.blue9}
          aria-hidden
        />
      </StyledSurfaceHeader>
      {review && availability?.isAvailable ? (
        <StyledSurfaceBody>
          <StyledStack>
            <SalesStatusPill tone="info">{review.companyName}</SalesStatusPill>
            <StyledFocus>
              {review.improvement?.title ??
                'No improvement note was added to this review.'}
            </StyledFocus>
            <StyledMutedText>
              {formatSalesDateTime(review.occurredAt)}
            </StyledMutedText>
            <SalesRecordButton
              onClick={() =>
                onOpenRecord({
                  recordType: 'meeting',
                  recordId: review.meetingId,
                })
              }
            >
              Open call review
            </SalesRecordButton>
          </StyledStack>
        </StyledSurfaceBody>
      ) : review ? (
        <SalesEmptyState
          title="Review unavailable"
          detail="This call does not have the transcript evidence needed for coaching."
        />
      ) : (
        <SalesEmptyState
          title="No reviewed call yet"
          detail="A completed call review will appear here after evidence is supplied."
        />
      )}
    </StyledPanel>
  );
};
