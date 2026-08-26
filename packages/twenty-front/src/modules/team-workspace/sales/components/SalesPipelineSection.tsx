import { styled } from '@linaria/react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type SalesOpportunityStage,
  type SalesWorkspaceCallbacks,
} from '@/team-workspace/sales/types/sales-workspace.types';
import {
  formatSalesDateTime,
  type SalesWorkspaceModel,
} from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import { getSalesOpportunityStageLabel } from '@/team-workspace/sales/utils/salesWorkspaceLabels';
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
  min-width: 1080px;
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

const StyledMissingText = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const stageTone = (stage: SalesOpportunityStage): SalesStatusTone => {
  if (stage === 'won') return 'positive';
  if (stage === 'lost' || stage === 'dnc') return 'danger';
  if (stage === 'proposal' || stage === 'decision') return 'info';
  if (stage === 'discovery' || stage === 'qualified') return 'warning';

  return 'neutral';
};

const getPipelineOutcome = (
  meeting: SalesWorkspaceModel['pipelineRows'][number]['latestPastMeeting'],
): string => {
  if (!meeting) return 'No past meeting recorded';
  if (meeting.status === 'outcome-missing') return 'Outcome missing';
  if (meeting.status === 'no-show') return 'Prospect did not attend';

  return meeting.outcome?.trim() || 'Outcome not recorded';
};

type SalesPipelineSectionProps = Pick<
  SalesWorkspaceCallbacks,
  'onUpdateOpportunity' | 'onOpenRecord'
> & {
  model: SalesWorkspaceModel;
};

export const SalesPipelineSection = ({
  model,
  onUpdateOpportunity,
  onOpenRecord,
}: SalesPipelineSectionProps) => {
  return (
    <StyledSalesSection aria-labelledby="sales-pipeline-heading">
      <SalesSectionHeading
        id="sales-pipeline-heading"
        eyebrow="Opportunity control"
        title="Pipeline"
        description="Each row keeps the last meeting, its outcome, the current stage, and the next commitment together."
      />

      <StyledTableSurface>
        {model.pipelineRows.length === 0 ? (
          <SalesEmptyState
            title="No opportunities yet"
            detail="New sales opportunities will appear here after they are added."
          />
        ) : (
          <StyledTableScroll>
            <StyledTable>
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr>
                  <StyledTableHeader scope="col">Opportunity</StyledTableHeader>
                  <StyledTableHeader scope="col">
                    Last meeting
                  </StyledTableHeader>
                  <StyledTableHeader scope="col">Outcome</StyledTableHeader>
                  <StyledTableHeader scope="col">Stage</StyledTableHeader>
                  <StyledTableHeader scope="col">
                    Next meeting
                  </StyledTableHeader>
                  <StyledTableHeader scope="col">Next action</StyledTableHeader>
                  <StyledTableHeader scope="col">Action</StyledTableHeader>
                </tr>
              </thead>
              <tbody>
                {model.pipelineRows.map(
                  ({ opportunity, latestPastMeeting, nextMeeting }) => (
                    <StyledTableRow key={opportunity.id}>
                      <StyledTableCell>
                        <StyledPrimaryText>
                          {opportunity.companyName}
                        </StyledPrimaryText>
                        <StyledSecondaryText>
                          {opportunity.contactName}
                        </StyledSecondaryText>
                      </StyledTableCell>
                      <StyledTableCell>
                        {latestPastMeeting ? (
                          <>
                            <StyledPrimaryText>
                              {formatSalesDateTime(latestPastMeeting.startsAt)}
                            </StyledPrimaryText>
                            <StyledSecondaryText>
                              {latestPastMeeting.status === 'outcome-missing'
                                ? 'Attendance not recorded'
                                : latestPastMeeting.contactName}
                            </StyledSecondaryText>
                          </>
                        ) : (
                          <StyledSecondaryText>
                            No past meeting recorded
                          </StyledSecondaryText>
                        )}
                      </StyledTableCell>
                      <StyledTableCell>
                        {latestPastMeeting?.status === 'outcome-missing' ? (
                          <StyledMissingText>Outcome missing</StyledMissingText>
                        ) : latestPastMeeting ? (
                          <StyledPrimaryText>
                            {getPipelineOutcome(latestPastMeeting)}
                          </StyledPrimaryText>
                        ) : (
                          <StyledSecondaryText>
                            No past meeting recorded
                          </StyledSecondaryText>
                        )}
                      </StyledTableCell>
                      <StyledTableCell>
                        <SalesStatusPill tone={stageTone(opportunity.stage)}>
                          {getSalesOpportunityStageLabel(opportunity.stage)}
                        </SalesStatusPill>
                      </StyledTableCell>
                      <StyledTableCell>
                        {nextMeeting ? (
                          <>
                            <StyledPrimaryText>
                              {formatSalesDateTime(nextMeeting.startsAt)}
                            </StyledPrimaryText>
                            <StyledSecondaryText>
                              {nextMeeting.timezoneLabel}
                            </StyledSecondaryText>
                          </>
                        ) : (
                          <StyledSecondaryText>Not booked</StyledSecondaryText>
                        )}
                      </StyledTableCell>
                      <StyledTableCell>
                        {opportunity.nextAction ? (
                          <>
                            <StyledPrimaryText>
                              {opportunity.nextAction}
                            </StyledPrimaryText>
                            {opportunity.nextActionDueAt && (
                              <StyledSecondaryText>
                                Due{' '}
                                {formatSalesDateTime(
                                  opportunity.nextActionDueAt,
                                )}
                              </StyledSecondaryText>
                            )}
                          </>
                        ) : (
                          <StyledMissingText>
                            Next action missing
                          </StyledMissingText>
                        )}
                      </StyledTableCell>
                      <StyledTableCell>
                        <StyledActionRow>
                          <Button
                            title="Update"
                            size="small"
                            variant="secondary"
                            onClick={() => onUpdateOpportunity(opportunity.id)}
                          />
                          <SalesRecordButton
                            ariaLabel={`Open ${opportunity.companyName}`}
                            onClick={() =>
                              onOpenRecord({
                                recordType: 'opportunity',
                                recordId: opportunity.id,
                              })
                            }
                          >
                            Open
                          </SalesRecordButton>
                        </StyledActionRow>
                      </StyledTableCell>
                    </StyledTableRow>
                  ),
                )}
              </tbody>
            </StyledTable>
          </StyledTableScroll>
        )}
      </StyledTableSurface>
    </StyledSalesSection>
  );
};
