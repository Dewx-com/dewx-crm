import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type TeamInboxMessage,
  type TeamInboxThread,
} from '@/team-inbox/hooks/useTeamInbox';
import {
  channelLabel,
  initialOf,
  previewOf,
  timeOfDay,
} from '@/team-inbox/utils/teamInboxFormat';

const StyledColumn = styled.div`
  border-left: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
  width: 300px;
`;

const StyledWho = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding-bottom: ${themeCssVariables.spacing[4]};
`;

const StyledAvatar = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.medium};
  border-radius: ${themeCssVariables.border.radius.rounded};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 48px;
  justify-content: center;
  width: 48px;
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledSub = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledSection = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]} 0;
`;

const StyledSectionTitle = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-transform: uppercase;
`;

const StyledRow = styled.div`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledKey = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  text-align: right;
`;

const StyledNote = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.45;
`;

const StyledFlag = styled.span`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.45;
`;

const StyledActivityRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledActivityHead = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledActivityBody = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

type Props = {
  thread?: TeamInboxThread;
  messages: TeamInboxMessage[];
};

export const TeamInboxContextPanel = ({ thread, messages }: Props) => {
  if (!thread) return <StyledColumn />;

  const recent = [...messages]
    .sort((a, b) =>
      String(b.sentAt ?? '').localeCompare(String(a.sentAt ?? '')),
    )
    .slice(0, 8);
  const refused = messages.filter(
    (message) => (message.state ?? '') === 'BLOCKED',
  );

  return (
    <StyledColumn>
      <StyledWho>
        <StyledAvatar>{initialOf(thread.contactAlias)}</StyledAvatar>
        <StyledName>{thread.contactAlias ?? thread.code}</StyledName>
        <StyledSub>via {channelLabel(thread.channel)}</StyledSub>
      </StyledWho>

      <StyledSection>
        <StyledSectionTitle>This conversation</StyledSectionTitle>
        <StyledRow>
          <StyledKey>Code</StyledKey>
          <StyledValue>{thread.code}</StyledValue>
        </StyledRow>
        <StyledRow>
          <StyledKey>Client</StyledKey>
          <StyledValue>{thread.client ?? '—'}</StyledValue>
        </StyledRow>
        <StyledRow>
          <StyledKey>Assigned to</StyledKey>
          <StyledValue>{thread.assignedTo ?? '—'}</StyledValue>
        </StyledRow>
        <StyledRow>
          <StyledKey>Status</StyledKey>
          <StyledValue>{thread.threadStatus ?? '—'}</StyledValue>
        </StyledRow>
        <StyledRow>
          <StyledKey>Priority</StyledKey>
          <StyledValue>{thread.priority ?? 'NORMAL'}</StyledValue>
        </StyledRow>
        <StyledRow>
          <StyledKey>Last message</StyledKey>
          <StyledValue>{timeOfDay(thread.lastMessageAt) || '—'}</StyledValue>
        </StyledRow>
      </StyledSection>

      {thread.flag && (
        <StyledSection>
          <StyledSectionTitle>Flagged</StyledSectionTitle>
          <StyledFlag>{thread.flag}</StyledFlag>
        </StyledSection>
      )}

      {refused.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Refused</StyledSectionTitle>
          {refused.slice(0, 3).map((message) => (
            <StyledActivityRow key={message.id}>
              <StyledActivityHead>
                {message.blockReason ?? 'refused'}
              </StyledActivityHead>
              <StyledActivityBody>
                {previewOf(message.body, 60)}
              </StyledActivityBody>
            </StyledActivityRow>
          ))}
        </StyledSection>
      )}

      <StyledSection>
        <StyledSectionTitle>Activity</StyledSectionTitle>
        {recent.length === 0 && <StyledNote>Nothing yet.</StyledNote>}
        {recent.map((message) => (
          <StyledActivityRow key={message.id}>
            <StyledActivityHead>
              {(message.direction ?? '') === 'IN' ? 'They wrote' : 'We wrote'} ·{' '}
              {timeOfDay(message.sentAt)}
              {message.state === 'QUEUED' ? ' · queued' : ''}
              {message.state === 'BLOCKED' ? ' · not sent' : ''}
            </StyledActivityHead>
            <StyledActivityBody>
              {previewOf(message.body, 70)}
            </StyledActivityBody>
          </StyledActivityRow>
        ))}
      </StyledSection>

      <StyledSection>
        <StyledSectionTitle>What is not here</StyledSectionTitle>
        <StyledNote>
          No phone number, no email address and no profile link — for this
          contact or any other. They are held on the Mac that owns the
          conversation and are never sent to this server, so they cannot be
          read, exported or shared from here. Sending happens on that account,
          which is why a reply carrying a number is refused rather than
          delivered.
        </StyledNote>
      </StyledSection>
    </StyledColumn>
  );
};
