import {
  type OperationsWorkspaceCallbacks,
  type OperationsWorkspaceData,
} from '@/team-workspace/operations/operations-workspace-types';
import { buildOperationsToday } from '@/team-workspace/operations/utils/operationsWorkspaceModel';
import { OperationsClientUpdateCard } from './operations-client-update-card';
import { OperationsHandoffCard } from './operations-handoff-card';
import { OperationsMeetingCard } from './operations-meeting-card';
import { OperationsSectionShell } from './operations-section-shell';
import { OperationsTaskCard } from './operations-task-card';
import { StyledPill } from './operations-workspace-elements';
import {
  StyledEmpty,
  StyledMetric,
  StyledMetricLabel,
  StyledMetrics,
  StyledMetricValue,
  StyledPanel,
  StyledPanelHead,
  StyledPanelTitle,
  StyledSection,
  StyledSectionHead,
  StyledSectionHint,
  StyledSectionTitle,
  StyledStack,
  StyledTwoColumns,
} from './operations-workspace-layout';

type OperationsTodaySectionProps = {
  data: OperationsWorkspaceData;
  now?: Date;
  callbacks: OperationsWorkspaceCallbacks;
};

export const OperationsTodaySection = ({
  data,
  now = new Date(),
  callbacks,
}: OperationsTodaySectionProps) => {
  const model = buildOperationsToday(data, now);
  const overduePromiseIds = new Set(
    model.overduePromises.map((task) => task.id),
  );
  const otherUrgentActions = model.urgentActions.filter(
    (task) => !overduePromiseIds.has(task.id),
  );
  const firstName = data.viewer.name.trim().split(/\s+/)[0] || 'there';

  return (
    <OperationsSectionShell
      eyebrow={`${data.viewer.name} · Operations`}
      title={`Good morning, ${firstName}`}
      lead="Protect client promises first, prepare the next conversation, then clear the work that is slowing delivery."
      headerAside={
        <StyledPill data-tone="info">Today’s control room</StyledPill>
      }
    >
      <StyledMetrics aria-label="Today’s operations summary">
        <StyledMetric
          data-tone={model.urgentActions.length > 0 ? 'watch' : undefined}
        >
          <StyledMetricValue>{model.urgentActions.length}</StyledMetricValue>
          <StyledMetricLabel>actions needing attention</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric
          data-tone={model.overduePromises.length > 0 ? 'risk' : undefined}
        >
          <StyledMetricValue>{model.overduePromises.length}</StyledMetricValue>
          <StyledMetricLabel>client promises overdue</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric
          data-tone={model.blockedWork.length > 0 ? 'watch' : undefined}
        >
          <StyledMetricValue>{model.blockedWork.length}</StyledMetricValue>
          <StyledMetricLabel>items blocked</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricValue>
            {model.clientsNeedingUpdate.length}
          </StyledMetricValue>
          <StyledMetricLabel>verified updates due</StyledMetricLabel>
        </StyledMetric>
      </StyledMetrics>

      <StyledTwoColumns>
        <StyledSection>
          <StyledSectionHead>
            <StyledSectionTitle>Act first</StyledSectionTitle>
            <StyledSectionHint>
              Commitments before routine work
            </StyledSectionHint>
          </StyledSectionHead>

          {model.overduePromises.length > 0 && (
            <StyledPanel>
              <StyledPanelHead>
                <StyledPanelTitle>Overdue client promises</StyledPanelTitle>
                <StyledPill data-tone="risk">
                  {model.overduePromises.length} overdue
                </StyledPill>
              </StyledPanelHead>
              <StyledStack>
                {model.overduePromises.map((task) => (
                  <OperationsTaskCard
                    key={task.id}
                    task={task}
                    now={now}
                    compact
                    callbacks={callbacks}
                  />
                ))}
              </StyledStack>
            </StyledPanel>
          )}

          <StyledPanel>
            <StyledPanelHead>
              <StyledPanelTitle>Urgent actions</StyledPanelTitle>
              <StyledPill>{otherUrgentActions.length}</StyledPill>
            </StyledPanelHead>
            <StyledStack>
              {otherUrgentActions.length > 0 ? (
                otherUrgentActions.map((task) => (
                  <OperationsTaskCard
                    key={task.id}
                    task={task}
                    now={now}
                    compact
                    callbacks={callbacks}
                  />
                ))
              ) : (
                <StyledEmpty>
                  {model.overduePromises.length > 0
                    ? 'No other urgent work. Close the promise above or prepare the next meeting.'
                    : 'No urgent or overdue work is recorded. Prepare the next meeting before pulling in routine work.'}
                </StyledEmpty>
              )}
            </StyledStack>
          </StyledPanel>
        </StyledSection>

        <StyledSection>
          <StyledSectionHead>
            <StyledSectionTitle>Next client meeting</StyledSectionTitle>
            <StyledSectionHint>Arrive ready, not reactive</StyledSectionHint>
          </StyledSectionHead>
          <StyledPanel>
            {model.nextMeeting !== null ? (
              <OperationsMeetingCard
                meeting={model.nextMeeting}
                callbacks={callbacks}
              />
            ) : (
              <StyledEmpty>
                No upcoming client meeting is scheduled. Keep the calendar
                source current so this view stays useful.
              </StyledEmpty>
            )}
          </StyledPanel>

          <StyledPanel>
            <StyledPanelHead>
              <StyledPanelTitle>Handoffs waiting for you</StyledPanelTitle>
              <StyledPill
                data-tone={
                  model.pendingHandoffs.length > 0 ? 'watch' : undefined
                }
              >
                {model.pendingHandoffs.length}
              </StyledPill>
            </StyledPanelHead>
            <StyledStack>
              {model.pendingHandoffs.length > 0 ? (
                model.pendingHandoffs.map((handoff) => (
                  <OperationsHandoffCard
                    key={handoff.id}
                    handoff={handoff}
                    now={now}
                    callbacks={callbacks}
                  />
                ))
              ) : (
                <StyledEmpty>
                  No handoffs are waiting for your decision.
                </StyledEmpty>
              )}
            </StyledStack>
          </StyledPanel>
        </StyledSection>
      </StyledTwoColumns>

      <StyledSection>
        <StyledSectionHead>
          <StyledSectionTitle>Blocked work</StyledSectionTitle>
          <StyledSectionHint>
            Record the reason, owner, and way forward
          </StyledSectionHint>
        </StyledSectionHead>
        <StyledPanel>
          <StyledStack>
            {model.blockedWork.length > 0 ? (
              model.blockedWork.map((task) => (
                <OperationsTaskCard
                  key={task.id}
                  task={task}
                  now={now}
                  callbacks={callbacks}
                />
              ))
            ) : (
              <StyledEmpty>No blocked work is recorded.</StyledEmpty>
            )}
          </StyledStack>
        </StyledPanel>
      </StyledSection>

      <StyledSection>
        <StyledSectionHead>
          <StyledSectionTitle>
            Clients needing a verified update
          </StyledSectionTitle>
          <StyledSectionHint>
            Draft notes do not count until the source is verified
          </StyledSectionHint>
        </StyledSectionHead>
        <StyledPanel>
          <StyledStack>
            {model.clientsNeedingUpdate.length > 0 ? (
              model.clientsNeedingUpdate.map((item) => (
                <OperationsClientUpdateCard
                  key={item.client.id}
                  item={item}
                  callbacks={callbacks}
                />
              ))
            ) : (
              <StyledEmpty>
                Every active client has a recent verified update.
              </StyledEmpty>
            )}
          </StyledStack>
        </StyledPanel>
      </StyledSection>
    </OperationsSectionShell>
  );
};
