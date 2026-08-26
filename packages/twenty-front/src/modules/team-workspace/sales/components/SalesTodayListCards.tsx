import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type SalesFollowUp,
  type SalesMeeting,
  type SalesRecordReference,
  type SalesWorkspaceCallbacks,
} from '@/team-workspace/sales/types/sales-workspace.types';
import { formatSalesDateTime } from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import {
  SalesEmptyState,
  SalesRecordButton,
  SalesStatusPill,
  StyledSurface,
  StyledSurfaceBody,
  StyledSurfaceHeader,
  StyledSurfaceTitle,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

const StyledPanel = styled(StyledSurface)`
  grid-column: span 6;

  @media (max-width: 840px) {
    grid-column: 1 / -1;
  }
`;

const StyledListItem = styled.div`
  align-items: flex-start;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} 0;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
`;

const StyledItemContent = styled.div`
  min-width: 0;
`;

const StyledItemTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1.4;
`;

const StyledItemMeta = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.45;
  margin-top: ${themeCssVariables.spacing[1]};
`;

const openFollowUpRecord = (
  followUp: SalesFollowUp,
  onOpenRecord: (record: SalesRecordReference) => void,
) => {
  onOpenRecord(
    followUp.opportunityId === undefined
      ? { recordType: 'follow-up', recordId: followUp.id }
      : { recordType: 'opportunity', recordId: followUp.opportunityId },
  );
};

type SalesOverdueFollowUpsCardProps = Pick<
  SalesWorkspaceCallbacks,
  'onOpenRecord'
> & {
  followUps: SalesFollowUp[];
};

export const SalesOverdueFollowUpsCard = ({
  followUps,
  onOpenRecord,
}: SalesOverdueFollowUpsCardProps) => (
  <StyledPanel>
    <StyledSurfaceHeader>
      <StyledSurfaceTitle>Overdue follow-ups</StyledSurfaceTitle>
      <SalesStatusPill tone={followUps.length > 0 ? 'danger' : 'positive'}>
        {followUps.length}
      </SalesStatusPill>
    </StyledSurfaceHeader>
    {followUps.length > 0 ? (
      <StyledSurfaceBody>
        {followUps.map((followUp) => (
          <StyledListItem key={followUp.id}>
            <StyledItemContent>
              <StyledItemTitle>{followUp.title}</StyledItemTitle>
              <StyledItemMeta>
                {followUp.companyName} · Due{' '}
                {formatSalesDateTime(followUp.dueAt)}
              </StyledItemMeta>
            </StyledItemContent>
            <SalesRecordButton
              ariaLabel={`Open ${followUp.title}`}
              onClick={() => openFollowUpRecord(followUp, onOpenRecord)}
            >
              Open
            </SalesRecordButton>
          </StyledListItem>
        ))}
      </StyledSurfaceBody>
    ) : (
      <SalesEmptyState
        title="Nothing is late"
        detail="Every follow-up due so far is cleared."
      />
    )}
  </StyledPanel>
);

type SalesUpcomingMeetingsCardProps = {
  meetings: SalesMeeting[];
};

export const SalesUpcomingMeetingsCard = ({
  meetings,
}: SalesUpcomingMeetingsCardProps) => (
  <StyledPanel>
    <StyledSurfaceHeader>
      <StyledSurfaceTitle>Upcoming calls</StyledSurfaceTitle>
      <SalesStatusPill tone="neutral">{meetings.length}</SalesStatusPill>
    </StyledSurfaceHeader>
    {meetings.length > 0 ? (
      <StyledSurfaceBody>
        {meetings.slice(0, 4).map((meeting) => (
          <StyledListItem key={meeting.id}>
            <StyledItemContent>
              <StyledItemTitle>
                {meeting.contactName} at {meeting.companyName}
              </StyledItemTitle>
              <StyledItemMeta>
                {formatSalesDateTime(meeting.startsAt)} ·{' '}
                {meeting.timezoneLabel}
              </StyledItemMeta>
            </StyledItemContent>
            <SalesStatusPill
              tone={
                meeting.preparationStatus === 'ready' ? 'positive' : 'warning'
              }
            >
              {meeting.preparationStatus === 'ready'
                ? 'Prepared'
                : 'Prep needed'}
            </SalesStatusPill>
          </StyledListItem>
        ))}
      </StyledSurfaceBody>
    ) : (
      <SalesEmptyState
        title="No upcoming calls"
        detail="New meetings will appear here after they are scheduled."
      />
    )}
  </StyledPanel>
);
