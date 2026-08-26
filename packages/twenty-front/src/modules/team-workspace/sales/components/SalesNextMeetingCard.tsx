import { styled } from '@linaria/react';
import { IconCalendarEvent, IconClock } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type SalesMeeting,
  type SalesWorkspaceCallbacks,
} from '@/team-workspace/sales/types/sales-workspace.types';
import {
  formatSalesDateTime,
  formatSalesRelativeTime,
} from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import {
  StyledActionRow,
  StyledSurface,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

const StyledNextMeeting = styled(StyledSurface)`
  background: linear-gradient(
    135deg,
    ${themeCssVariables.color.blue9},
    ${themeCssVariables.color.blue}
  );
  border-color: transparent;
  color: ${themeCssVariables.font.color.inverted};
  grid-column: span 8;
  overflow: hidden;
  padding: ${themeCssVariables.spacing[6]};

  @media (max-width: 840px) {
    grid-column: 1 / -1;
  }
`;

const StyledEyebrow = styled.div`
  align-items: center;
  color: ${themeCssVariables.color.blue3};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
  letter-spacing: 0.04em;
`;

const StyledTitle = styled.h2`
  color: inherit;
  font-size: clamp(
    ${themeCssVariables.font.size.xl},
    3vw,
    ${themeCssVariables.font.size.xxl}
  );
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.025em;
  line-height: 1.15;
  margin: ${themeCssVariables.spacing[3]} 0 ${themeCssVariables.spacing[2]};
`;

const StyledCopy = styled.p`
  color: ${themeCssVariables.color.blue3};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.55;
  margin: 0;
  max-width: 620px;
`;

const StyledMeta = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  margin: ${themeCssVariables.spacing[5]} 0;
`;

const StyledMetaItem = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.inverted};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.inverted};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

type SalesNextMeetingCardProps = Pick<
  SalesWorkspaceCallbacks,
  'onPrepareMeeting' | 'onOpenRecord'
> & {
  meeting?: SalesMeeting;
  now: string;
};

export const SalesNextMeetingCard = ({
  meeting,
  now,
  onPrepareMeeting,
  onOpenRecord,
}: SalesNextMeetingCardProps) => {
  if (!meeting) {
    return (
      <StyledNextMeeting>
        <StyledEyebrow>
          <IconCalendarEvent size={14} aria-hidden />
          Next sales meeting
        </StyledEyebrow>
        <StyledTitle>No call is scheduled</StyledTitle>
        <StyledCopy>
          Your calendar has no upcoming sales meeting in this workspace.
        </StyledCopy>
      </StyledNextMeeting>
    );
  }

  return (
    <StyledNextMeeting>
      <StyledEyebrow>
        <IconClock size={14} aria-hidden />
        {formatSalesRelativeTime(meeting.startsAt, now)}
      </StyledEyebrow>
      <StyledTitle>
        {meeting.contactName} at {meeting.companyName}
      </StyledTitle>
      <StyledCopy>
        {meeting.preparationSummary ??
          'No prep note has been added for this call yet.'}
      </StyledCopy>
      <StyledMeta>
        <StyledMetaItem>
          <IconCalendarEvent size={14} aria-hidden />
          {formatSalesDateTime(meeting.startsAt)}
        </StyledMetaItem>
        <StyledMetaItem>{meeting.durationMinutes} min</StyledMetaItem>
        <StyledMetaItem>{meeting.timezoneLabel}</StyledMetaItem>
      </StyledMeta>
      <StyledActionRow>
        <Button
          title={
            meeting.preparationStatus === 'ready'
              ? 'Review call prep'
              : 'Prepare call'
          }
          accent="blue"
          inverted
          onClick={() => onPrepareMeeting(meeting.id)}
        />
        <Button
          title="Open meeting"
          variant="secondary"
          inverted
          onClick={() =>
            onOpenRecord({ recordType: 'meeting', recordId: meeting.id })
          }
        />
      </StyledActionRow>
    </StyledNextMeeting>
  );
};
