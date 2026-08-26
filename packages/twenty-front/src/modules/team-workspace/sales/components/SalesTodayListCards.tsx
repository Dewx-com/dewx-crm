import { styled } from '@linaria/react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type SalesFollowUp,
  type SalesMeeting,
  type SalesWorkspaceCallbacks,
} from '@/team-workspace/sales/types/sales-workspace.types';
import { formatSalesDateTime } from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import {
  SalesEmptyState,
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

const StyledItemDetail = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin-top: ${themeCssVariables.spacing[1]};
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const StyledWorkItem = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  padding: ${themeCssVariables.spacing[3]} 0;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
`;

const StyledWorkHead = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledWorkActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: ${themeCssVariables.spacing[3]};
`;

type SalesAssignedWorkCardProps = Pick<
  SalesWorkspaceCallbacks,
  'onTaskStatusChange'
> & {
  followUps: SalesFollowUp[];
  now: string;
};

export const SalesAssignedWorkCard = ({
  followUps,
  now,
  onTaskStatusChange,
}: SalesAssignedWorkCardProps) => {
  const nowTimestamp = Date.parse(now);
  const overdueCount = followUps.filter(
    (followUp) => Date.parse(followUp.dueAt) < nowTimestamp,
  ).length;

  return (
    <StyledPanel>
      <StyledSurfaceHeader>
        <StyledSurfaceTitle>Assigned work</StyledSurfaceTitle>
        <SalesStatusPill tone={overdueCount > 0 ? 'danger' : 'neutral'}>
          {overdueCount > 0
            ? `${followUps.length} open, ${overdueCount} overdue`
            : `${followUps.length} open`}
        </SalesStatusPill>
      </StyledSurfaceHeader>
      {followUps.length > 0 ? (
        <StyledSurfaceBody>
          {followUps.map((followUp) => {
            const isOverdue = Date.parse(followUp.dueAt) < nowTimestamp;

            return (
              <StyledWorkItem key={followUp.id}>
                <StyledWorkHead>
                  <StyledItemContent>
                    <StyledItemTitle>{followUp.title}</StyledItemTitle>
                    {followUp.detail && (
                      <StyledItemDetail>{followUp.detail}</StyledItemDetail>
                    )}
                    <StyledItemMeta>
                      {followUp.companyName} · Due{' '}
                      {formatSalesDateTime(followUp.dueAt)}
                    </StyledItemMeta>
                  </StyledItemContent>
                  <SalesStatusPill
                    tone={
                      isOverdue
                        ? 'danger'
                        : followUp.status === 'in-progress'
                          ? 'info'
                          : 'neutral'
                    }
                  >
                    {isOverdue
                      ? 'Overdue'
                      : followUp.status === 'in-progress'
                        ? 'In progress'
                        : 'To do'}
                  </SalesStatusPill>
                </StyledWorkHead>
                <StyledWorkActions>
                  {followUp.status === 'todo' ? (
                    <Button
                      title="Start work"
                      size="small"
                      variant="primary"
                      accent="blue"
                      disabled={!onTaskStatusChange}
                      onClick={() =>
                        onTaskStatusChange?.({
                          taskId: followUp.id,
                          status: 'in-progress',
                        })
                      }
                    />
                  ) : (
                    <Button
                      title="Move to do"
                      size="small"
                      variant="secondary"
                      disabled={!onTaskStatusChange}
                      onClick={() =>
                        onTaskStatusChange?.({
                          taskId: followUp.id,
                          status: 'todo',
                        })
                      }
                    />
                  )}
                  <Button
                    title="Finish with evidence"
                    size="small"
                    variant="secondary"
                    disabled={!onTaskStatusChange}
                    onClick={() =>
                      onTaskStatusChange?.({
                        taskId: followUp.id,
                        status: 'done',
                      })
                    }
                  />
                </StyledWorkActions>
              </StyledWorkItem>
            );
          })}
        </StyledSurfaceBody>
      ) : (
        <SalesEmptyState
          title="No assigned work"
          detail="New assignments will appear here."
        />
      )}
    </StyledPanel>
  );
};

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
