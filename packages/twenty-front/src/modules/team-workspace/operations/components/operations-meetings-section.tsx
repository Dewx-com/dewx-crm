import {
  type OperationsWorkspaceCallbacks,
  type OperationsWorkspaceData,
} from '@/team-workspace/operations/operations-workspace-types';
import {
  recentMeetings,
  upcomingMeetings,
} from '@/team-workspace/operations/utils/operationsWorkspaceModel';
import { OperationsMeetingCard } from './operations-meeting-card';
import { OperationsSectionShell } from './operations-section-shell';
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

type OperationsMeetingsSectionProps = {
  data: OperationsWorkspaceData;
  now?: Date;
  callbacks: OperationsWorkspaceCallbacks;
};

export const OperationsMeetingsSection = ({
  data,
  now = new Date(),
  callbacks,
}: OperationsMeetingsSectionProps) => {
  const upcoming = upcomingMeetings(data.meetings, now);
  const recent = recentMeetings(data.meetings, now);
  const nextMeeting = upcoming[0] ?? null;
  const followingMeetings = upcoming.slice(1);
  const prepNeeded = upcoming.filter(
    (meeting) => meeting.prepStatus !== 'ready',
  ).length;
  const readyCount = upcoming.length - prepNeeded;

  return (
    <OperationsSectionShell
      eyebrow={`${data.viewer.name} · Operations`}
      title="Meetings"
      lead="Know what is next, carry forward the last client context, and make preparation visible before the call begins."
      headerAside={
        <StyledPill data-tone={prepNeeded > 0 ? 'watch' : 'healthy'}>
          {prepNeeded > 0 ? `${prepNeeded} need prep` : 'Prep is current'}
        </StyledPill>
      }
    >
      <StyledMetrics aria-label="Meeting preparation summary">
        <StyledMetric>
          <StyledMetricValue>{upcoming.length}</StyledMetricValue>
          <StyledMetricLabel>upcoming meetings</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric data-tone={prepNeeded > 0 ? 'watch' : undefined}>
          <StyledMetricValue>{prepNeeded}</StyledMetricValue>
          <StyledMetricLabel>need preparation</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricValue>{readyCount}</StyledMetricValue>
          <StyledMetricLabel>ready to run</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricValue>{recent.length}</StyledMetricValue>
          <StyledMetricLabel>recent meeting records</StyledMetricLabel>
        </StyledMetric>
      </StyledMetrics>

      <StyledTwoColumns>
        <StyledSection>
          <StyledSectionHead>
            <StyledSectionTitle>Next client meeting</StyledSectionTitle>
            <StyledSectionHint>Prepare this one first</StyledSectionHint>
          </StyledSectionHead>
          <StyledPanel>
            {nextMeeting !== null ? (
              <OperationsMeetingCard
                meeting={nextMeeting}
                callbacks={callbacks}
              />
            ) : (
              <StyledEmpty>
                No upcoming client meeting is scheduled. Check the calendar
                source before making delivery commitments.
              </StyledEmpty>
            )}
          </StyledPanel>
        </StyledSection>

        <StyledSection>
          <StyledSectionHead>
            <StyledSectionTitle>After that</StyledSectionTitle>
            <StyledSectionHint>
              {followingMeetings.length} scheduled
            </StyledSectionHint>
          </StyledSectionHead>
          <StyledPanel>
            <StyledStack>
              {followingMeetings.length > 0 ? (
                followingMeetings.map((meeting) => (
                  <OperationsMeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    compact
                    callbacks={callbacks}
                  />
                ))
              ) : (
                <StyledEmpty>No later meetings are scheduled.</StyledEmpty>
              )}
            </StyledStack>
          </StyledPanel>
        </StyledSection>
      </StyledTwoColumns>

      <StyledSection>
        <StyledSectionHead>
          <StyledSectionTitle>Recent meeting context</StyledSectionTitle>
          <StyledSectionHint>
            Review what happened before planning the next promise
          </StyledSectionHint>
        </StyledSectionHead>
        <StyledPanel>
          <StyledPanelHead>
            <StyledPanelTitle>
              Recent and unclosed conversations
            </StyledPanelTitle>
            <StyledPill>{recent.length}</StyledPill>
          </StyledPanelHead>
          <StyledStack>
            {recent.length > 0 ? (
              recent.map((meeting) => (
                <OperationsMeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  callbacks={callbacks}
                />
              ))
            ) : (
              <StyledEmpty>
                No completed meeting record is available yet.
              </StyledEmpty>
            )}
          </StyledStack>
        </StyledPanel>
      </StyledSection>
    </OperationsSectionShell>
  );
};
