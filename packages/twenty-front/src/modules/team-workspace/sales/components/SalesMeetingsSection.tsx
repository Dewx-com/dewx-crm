import { styled } from '@linaria/react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type SalesMeeting,
  type SalesMeetingStatus,
  type SalesOpportunityStage,
  type SalesWorkspaceCallbacks,
  type SalesWorkspaceData,
} from '@/team-workspace/sales/types/sales-workspace.types';
import {
  formatSalesDateTime,
  type SalesWorkspaceModel,
} from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import {
  getSalesMeetingKindLabel,
  getSalesMeetingStatusLabel,
  getSalesOpportunityStageLabel,
} from '@/team-workspace/sales/utils/salesWorkspaceLabels';
import {
  SalesEmptyState,
  SalesRecordButton,
  SalesSectionHeading,
  SalesStatusPill,
  type SalesStatusTone,
  StyledActionRow,
  StyledSalesSection,
  StyledSurface,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

const StyledTableSurface = styled(StyledSurface)`
  overflow: hidden;
`;

const StyledTableScroll = styled.div`
  overflow-x: auto;
  overscroll-behavior-inline: contain;
`;

const StyledTable = styled.table`
  border-collapse: collapse;
  min-width: 940px;
  table-layout: fixed;
  width: 100%;
`;

const StyledTableHeader = styled.th`
  background: ${themeCssVariables.background.tertiary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.03em;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  text-align: left;
`;

const StyledTableCell = styled.td`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.45;
  padding: ${themeCssVariables.spacing[4]};
  vertical-align: top;
`;

const StyledTableRow = styled.tr`
  &:last-child ${StyledTableCell} {
    border-bottom: 0;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover ${StyledTableCell} {
      background: ${themeCssVariables.background.transparent.lighter};
    }
  }
`;

const StyledPrimaryText = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledSecondaryText = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin-top: ${themeCssVariables.spacing[1]};
`;

const meetingTone = (status: SalesMeetingStatus): SalesStatusTone => {
  if (status === 'prepared' || status === 'attended') return 'positive';
  if (status === 'scheduled') return 'info';
  if (status === 'outcome-missing') return 'warning';
  if (status === 'no-show') return 'danger';
  if (status === 'rescheduled') return 'warning';

  return 'neutral';
};

const stageTone = (stage: SalesOpportunityStage): SalesStatusTone => {
  if (stage === 'won') return 'positive';
  if (stage === 'lost' || stage === 'dnc') return 'danger';
  if (stage === 'proposal' || stage === 'decision') return 'info';
  if (stage === 'discovery' || stage === 'qualified') return 'warning';

  return 'neutral';
};

const getMeetingOutcome = (meeting: SalesMeeting): string => {
  const outcome = meeting.outcome?.trim();

  if (outcome) return outcome;
  if (meeting.status === 'attended') return 'Outcome not recorded';
  if (meeting.status === 'outcome-missing') {
    return 'Attendance and outcome are not recorded';
  }
  if (meeting.status === 'no-show') return 'Prospect did not attend';
  if (meeting.status === 'cancelled') return 'Call cancelled';
  if (meeting.status === 'rescheduled') return 'Waiting for the new time';

  return 'No outcome yet';
};

type SalesMeetingsSectionProps = Pick<
  SalesWorkspaceCallbacks,
  'onPrepareMeeting' | 'onCompleteMeeting' | 'onOpenRecord'
> & {
  data: SalesWorkspaceData;
  model: SalesWorkspaceModel;
};

export const SalesMeetingsSection = ({
  data,
  model,
  onPrepareMeeting,
  onCompleteMeeting,
  onOpenRecord,
}: SalesMeetingsSectionProps) => {
  const opportunitiesById = new Map(
    data.opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );

  return (
    <StyledSalesSection aria-labelledby="sales-meetings-heading">
      <SalesSectionHeading
        id="sales-meetings-heading"
        eyebrow="Sales calls"
        title="Meetings"
        description="See what happened and where the opportunity stands. The next action stays beside the call."
      />

      <StyledTableSurface>
        {model.meetings.length === 0 ? (
          <SalesEmptyState
            title="No meetings yet"
            detail="Scheduled and completed sales calls will appear here."
          />
        ) : (
          <StyledTableScroll>
            <StyledTable>
              <colgroup>
                <col style={{ width: '21%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr>
                  <StyledTableHeader scope="col">Meeting</StyledTableHeader>
                  <StyledTableHeader scope="col">When</StyledTableHeader>
                  <StyledTableHeader scope="col">Call status</StyledTableHeader>
                  <StyledTableHeader scope="col">Pipeline</StyledTableHeader>
                  <StyledTableHeader scope="col">Outcome</StyledTableHeader>
                  <StyledTableHeader scope="col">Action</StyledTableHeader>
                </tr>
              </thead>
              <tbody>
                {model.meetings.map((meeting) => {
                  const opportunity = meeting.opportunityId
                    ? opportunitiesById.get(meeting.opportunityId)
                    : undefined;
                  const canComplete =
                    meeting.status === 'scheduled' ||
                    meeting.status === 'prepared';

                  return (
                    <StyledTableRow key={meeting.id}>
                      <StyledTableCell>
                        <StyledPrimaryText>
                          {meeting.contactName}
                        </StyledPrimaryText>
                        <StyledSecondaryText>
                          {meeting.companyName} ·{' '}
                          {getSalesMeetingKindLabel(meeting.kind)}
                        </StyledSecondaryText>
                      </StyledTableCell>
                      <StyledTableCell>
                        <StyledPrimaryText>
                          {formatSalesDateTime(meeting.startsAt)}
                        </StyledPrimaryText>
                        <StyledSecondaryText>
                          {meeting.durationMinutes} min ·{' '}
                          {meeting.timezoneLabel}
                        </StyledSecondaryText>
                      </StyledTableCell>
                      <StyledTableCell>
                        <SalesStatusPill tone={meetingTone(meeting.status)}>
                          {getSalesMeetingStatusLabel(meeting.status)}
                        </SalesStatusPill>
                        <StyledSecondaryText>
                          Prep: {meeting.preparationStatus.replace('-', ' ')}
                        </StyledSecondaryText>
                      </StyledTableCell>
                      <StyledTableCell>
                        {opportunity ? (
                          <SalesStatusPill tone={stageTone(opportunity.stage)}>
                            {getSalesOpportunityStageLabel(opportunity.stage)}
                          </SalesStatusPill>
                        ) : (
                          <StyledSecondaryText>Not linked</StyledSecondaryText>
                        )}
                      </StyledTableCell>
                      <StyledTableCell>
                        <StyledPrimaryText>
                          {getMeetingOutcome(meeting)}
                        </StyledPrimaryText>
                        {opportunity?.nextAction && (
                          <StyledSecondaryText>
                            Next: {opportunity.nextAction}
                          </StyledSecondaryText>
                        )}
                      </StyledTableCell>
                      <StyledTableCell>
                        <StyledActionRow>
                          {canComplete && (
                            <>
                              <Button
                                title="Prepare"
                                size="small"
                                variant="secondary"
                                onClick={() => onPrepareMeeting(meeting.id)}
                              />
                              <Button
                                title="Complete"
                                size="small"
                                variant="tertiary"
                                onClick={() => onCompleteMeeting(meeting.id)}
                              />
                            </>
                          )}
                          {!canComplete && (
                            <SalesRecordButton
                              onClick={() =>
                                onOpenRecord({
                                  recordType: 'meeting',
                                  recordId: meeting.id,
                                })
                              }
                            >
                              Open
                            </SalesRecordButton>
                          )}
                        </StyledActionRow>
                      </StyledTableCell>
                    </StyledTableRow>
                  );
                })}
              </tbody>
            </StyledTable>
          </StyledTableScroll>
        )}
      </StyledTableSurface>
    </StyledSalesSection>
  );
};
