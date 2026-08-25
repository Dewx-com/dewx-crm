import { styled } from '@linaria/react';
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { IconPaperclip, IconSend } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type TeamInboxMessage,
  type TeamInboxThread,
} from '@/team-inbox/hooks/useTeamInbox';
import {
  channelLabel,
  dayLabel,
  dayKey,
  initialOf,
  isAttachmentPlaceholder,
  timeOfDay,
} from '@/team-inbox/utils/teamInboxFormat';

const StyledColumn = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
`;

const StyledHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledAvatar = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.medium};
  border-radius: ${themeCssVariables.border.radius.rounded};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 32px;
  justify-content: center;
  width: 32px;
`;

const StyledWho = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledSub = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledScroll = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledDaySeparator = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing[3]} 0 ${themeCssVariables.spacing[1]};
  text-align: center;
`;

const StyledIncomingRow = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const StyledOutgoingRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const StyledBubbleColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 68%;
`;

const StyledIncomingBubble = styled.div`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.45;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  white-space: pre-wrap;
  word-break: break-word;
`;

const StyledOutgoingBubble = styled(StyledIncomingBubble)`
  background: ${themeCssVariables.accent.quaternary};
`;

const StyledBlockedBubble = styled(StyledIncomingBubble)`
  background: ${themeCssVariables.background.danger};
  border: 1px solid ${themeCssVariables.border.color.danger};
`;

// A file is not a message. It arrives as the words "[attachment — not shared]", and drawing that in
// a bubble would put words in somebody's mouth that they never typed — so it is a note about the
// conversation, sitting in the middle, in the voice of the system.
const StyledSystemLine = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.light};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-style: italic;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: center;
  padding: ${themeCssVariables.spacing[1]} 0;
`;

const StyledStamp = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledStampRight = styled(StyledStamp)`
  text-align: right;
`;

const StyledComposer = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledTextarea = styled.textarea`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  min-height: 56px;
  outline: none;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  resize: vertical;
  width: 100%;
`;

const StyledComposerFoot = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.light};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledComposerActions = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[2]};
`;

// ⌘↩ is faster once you know it, and invisible until somebody tells you. The button is for
// everybody else, and it is the same action — not a second, slightly different way to send.
const StyledSendButton = styled.button`
  align-items: center;
  background: ${themeCssVariables.color.blue};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.inverted};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;

const StyledWarning = styled.span`
  color: ${themeCssVariables.font.color.danger};
`;

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  font-size: ${themeCssVariables.font.size.md};
  justify-content: center;
`;

// Kept in step with the engine's guard (core/teamInbox.ts). This is a courtesy, not the enforcement:
// the refusal that matters happens on the Mac, after this page has already let the words go.
const LOOKS_LIKE_IDENTIFIER =
  /(\+?\d[\d\s().-]{6,}\d)|([\w.+-]+@[\w-]+\.[\w.]{2,})|(https?:\/\/|www\.)/i;
const OFF_CHANNEL =
  /(my number|your number|phone number|whatsapp me|call me|email me|reach me at|take (this|it) offline|telegram|skype)/i;

type Props = {
  thread?: TeamInboxThread;
  messages: TeamInboxMessage[];
  loading: boolean;
  sending: boolean;
  onSend: (text: string) => Promise<void> | void;
};

export const TeamInboxConversation = ({
  thread,
  messages,
  loading,
  sending,
  onSend,
}: Props) => {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, thread?.code]);

  useEffect(() => {
    setDraft('');
  }, [thread?.code]);

  if (!thread) {
    return (
      <StyledColumn>
        <StyledEmpty>Pick a conversation on the left.</StyledEmpty>
      </StyledColumn>
    );
  }

  const willBeRefused = LOOKS_LIKE_IDENTIFIER.test(draft) || OFF_CHANNEL.test(draft);
  const canSend = draft.trim() !== '' && !sending;
  const archived = (thread.threadStatus ?? '').toUpperCase() === 'CLOSED';

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    await onSend(text);
    setDraft('');
  };

  let lastDay = '';

  return (
    <StyledColumn>
      <StyledHeader>
        <StyledAvatar>{initialOf(thread.contactAlias)}</StyledAvatar>
        <StyledWho>
          <StyledName>{thread.contactAlias ?? thread.code}</StyledName>
          <StyledSub>
            {channelLabel(thread.channel)} · {thread.code}
            {thread.client ? ` · ${thread.client.toLowerCase()}` : ''}
            {archived ? ' · archived' : ''}
          </StyledSub>
        </StyledWho>
      </StyledHeader>

      <StyledScroll>
        {messages.length === 0 && (
          <StyledEmpty>
            {loading
              ? 'Loading this conversation…'
              : 'Nothing has been mirrored into this thread yet.'}
          </StyledEmpty>
        )}
        {messages.map((message) => {
          const day = dayKey(message.sentAt);
          const separator = day !== lastDay ? dayLabel(message.sentAt) : '';
          lastDay = day;
          const outgoing = (message.direction ?? '') !== 'IN';
          const blocked = (message.state ?? '') === 'BLOCKED';

          if (isAttachmentPlaceholder(message.body)) {
            return (
              <div key={message.id}>
                {separator !== '' && <StyledDaySeparator>{separator}</StyledDaySeparator>}
                <StyledSystemLine>
                  <IconPaperclip size={12} />
                  {outgoing
                    ? 'An attachment went out on this account'
                    : 'They sent an attachment'}
                  {' — the file is not shared with this inbox'}
                  {timeOfDay(message.sentAt) ? ` · ${timeOfDay(message.sentAt)}` : ''}
                </StyledSystemLine>
              </div>
            );
          }

          const Row = outgoing ? StyledOutgoingRow : StyledIncomingRow;
          const Bubble = blocked
            ? StyledBlockedBubble
            : outgoing
              ? StyledOutgoingBubble
              : StyledIncomingBubble;
          const Stamp = outgoing ? StyledStampRight : StyledStamp;

          return (
            <div key={message.id}>
              {separator !== '' && <StyledDaySeparator>{separator}</StyledDaySeparator>}
              <Row>
                <StyledBubbleColumn>
                  <Bubble>{message.body}</Bubble>
                  <Stamp>
                    {timeOfDay(message.sentAt)}
                    {message.state === 'QUEUED' ? ' · queued' : ''}
                    {blocked ? ` · not sent: ${message.blockReason ?? 'refused'}` : ''}
                  </Stamp>
                </StyledBubbleColumn>
              </Row>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </StyledScroll>

      <StyledComposer>
        <StyledTextarea
          value={draft}
          placeholder="Message"
          disabled={sending}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <StyledComposerFoot>
          <span>
            {willBeRefused ? (
              <StyledWarning>
                This carries a number, a link or an off-channel phrase — it will be refused, not sent.
              </StyledWarning>
            ) : (
              'Sent from the account that owns this conversation.'
            )}
          </span>
          <StyledComposerActions>
            <span>{sending ? 'queueing…' : '⌘↩'}</span>
            <StyledSendButton
              type="button"
              disabled={!canSend}
              onClick={() => void send()}
              aria-label="Send"
            >
              <IconSend size={13} />
              Send
            </StyledSendButton>
          </StyledComposerActions>
        </StyledComposerFoot>
      </StyledComposer>
    </StyledColumn>
  );
};
