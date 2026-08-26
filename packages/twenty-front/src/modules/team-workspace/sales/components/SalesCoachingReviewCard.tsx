import { styled } from '@linaria/react';
import { IconMessageCircle, IconSparkles } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type SalesCoachingReview } from '@/team-workspace/sales/types/sales-workspace.types';
import {
  formatSalesDateTime,
  getSalesCoachingAvailability,
} from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import {
  SalesRecordButton,
  SalesStatusPill,
  StyledActionRow,
  StyledMutedText,
  StyledStack,
  StyledSurface,
  StyledSurfaceBody,
  StyledSurfaceHeader,
  StyledSurfaceTitle,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

const StyledReviewCard = styled(StyledSurface)`
  overflow: hidden;
`;

const StyledHeaderMeta = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledScore = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.03em;
  line-height: 1;
`;

const StyledSummary = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0;
  max-width: 760px;
`;

const StyledInsightGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const StyledInsight = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledInsightTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0 0 ${themeCssVariables.spacing[2]};
`;

const StyledInsightText = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.55;
  margin: 0;
`;

const StyledStrengthList = styled.ul`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  line-height: 1.5;
  margin: 0;
  padding-left: ${themeCssVariables.spacing[4]};
`;

const StyledEvidenceTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: ${themeCssVariables.spacing[2]} 0 0;
`;

const StyledEvidence = styled.div`
  border-left: 2px solid ${themeCssVariables.border.color.blue};
  padding-left: ${themeCssVariables.spacing[4]};
`;

const StyledEvidenceMeta = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledEvidenceObservation = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin-top: ${themeCssVariables.spacing[1]};
`;

const StyledExcerpt = styled.blockquote`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-style: italic;
  line-height: 1.5;
  margin: ${themeCssVariables.spacing[2]} 0 0;
`;

const StyledUnavailable = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing[5]};
`;

const getUnavailableCopy = (
  reason: 'missing-transcript' | 'processing' | 'missing-evidence',
) => {
  if (reason === 'missing-transcript') {
    return 'This call has no transcript, so there is no evidence-backed coaching yet.';
  }

  if (reason === 'processing') {
    return 'The transcript is still processing. Coaching will appear after the evidence is ready.';
  }

  return 'The transcript exists, but the review has no cited evidence yet.';
};

type SalesCoachingReviewCardProps = {
  review: SalesCoachingReview;
  onOpenMeeting: (meetingId: string) => void;
  onRecordLesson?: (reviewId: string) => void;
};

export const SalesCoachingReviewCard = ({
  review,
  onOpenMeeting,
  onRecordLesson,
}: SalesCoachingReviewCardProps) => {
  const availability = getSalesCoachingAvailability(review);

  return (
    <StyledReviewCard>
      <StyledSurfaceHeader>
        <div>
          <StyledSurfaceTitle>
            {review.contactName} at {review.companyName}
          </StyledSurfaceTitle>
          <StyledMutedText>
            {formatSalesDateTime(review.occurredAt)}
          </StyledMutedText>
        </div>
        <StyledHeaderMeta>
          {availability.isAvailable && review.score !== undefined && (
            <StyledScore aria-label={`Call score ${review.score} out of 10`}>
              {review.score.toFixed(1)}
            </StyledScore>
          )}
          <SalesStatusPill
            tone={availability.isAvailable ? 'positive' : 'warning'}
          >
            {availability.isAvailable ? 'Evidence ready' : 'Review unavailable'}
          </SalesStatusPill>
        </StyledHeaderMeta>
      </StyledSurfaceHeader>

      <StyledSurfaceBody>
        {availability.isAvailable ? (
          <StyledStack>
            <StyledSummary>{availability.review.summary}</StyledSummary>

            {(availability.review.strengths?.length ||
              availability.review.improvement) && (
              <StyledInsightGrid>
                {availability.review.strengths?.length ? (
                  <StyledInsight>
                    <StyledInsightTitle>What worked</StyledInsightTitle>
                    <StyledStrengthList>
                      {availability.review.strengths.map((strength) => (
                        <li key={strength}>{strength}</li>
                      ))}
                    </StyledStrengthList>
                  </StyledInsight>
                ) : null}
                {availability.review.improvement ? (
                  <StyledInsight>
                    <StyledInsightTitle>Work on next</StyledInsightTitle>
                    <StyledInsightText>
                      {availability.review.improvement.title}
                      {availability.review.improvement.detail
                        ? ` ${availability.review.improvement.detail}`
                        : ''}
                    </StyledInsightText>
                  </StyledInsight>
                ) : null}
              </StyledInsightGrid>
            )}

            <StyledEvidenceTitle>Call evidence</StyledEvidenceTitle>
            {availability.review.evidence.map((evidence) => (
              <StyledEvidence key={evidence.id}>
                <StyledEvidenceMeta>
                  <IconMessageCircle size={13} aria-hidden />
                  {evidence.timestampLabel}
                </StyledEvidenceMeta>
                <StyledEvidenceObservation>
                  {evidence.observation}
                </StyledEvidenceObservation>
                {evidence.excerpt && (
                  <StyledExcerpt>{evidence.excerpt}</StyledExcerpt>
                )}
              </StyledEvidence>
            ))}
          </StyledStack>
        ) : (
          <StyledUnavailable>
            <StyledStack>
              <IconSparkles
                size={18}
                color={themeCssVariables.font.color.tertiary}
                aria-hidden
              />
              <StyledSurfaceTitle>Review unavailable</StyledSurfaceTitle>
              <StyledMutedText>
                {getUnavailableCopy(availability.reason)}
              </StyledMutedText>
            </StyledStack>
          </StyledUnavailable>
        )}

        <StyledActionRow style={{ marginTop: themeCssVariables.spacing[4] }}>
          {availability.isAvailable && onRecordLesson && (
            <Button
              title="Record what to improve"
              accent="blue"
              onClick={() => onRecordLesson(review.id)}
            />
          )}
          <SalesRecordButton onClick={() => onOpenMeeting(review.meetingId)}>
            Open meeting
          </SalesRecordButton>
        </StyledActionRow>
      </StyledSurfaceBody>
    </StyledReviewCard>
  );
};
