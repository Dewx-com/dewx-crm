import {
  StyledChip,
  StyledEmpty,
  StyledHint,
  StyledNote,
  StyledScroller,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
  StyledTable,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import { agoWords } from '@/client-workspace/utils/clientWorkspaceModel';
import {
  formatWait,
  REPLY_SLA_WORKING_HOURS,
  WORK_END_HOUR,
  WORK_START_HOUR,
  type WaitingReply,
} from '@/today/utils/todayModel';

// ── Replies waiting ─────────────────────────────────────────────────────────────────────────────
//
// The first section, because a reply is the only thing on this page with someone on the other end
// of it. Longest wait first, and the wait is counted in working hours so that Friday evening does
// not become Monday's emergency.
//
// Two states shout, and only two, because a page where everything shouts says nothing: past the
// four-hour mark, and nobody's job. The second is the one that actually loses replies — a row with
// no owner is not late yet, it is simply not anybody's.

const STATUS_WORDS: Record<string, string> = {
  TODO: 'not started',
  IN_PROGRESS: 'in progress',
};

const TONE: Record<string, string> = {
  BREACHED: 'risk',
  DUE: 'watch',
  FRESH: 'calm',
};

type Props = {
  replies: WaitingReply[];
  showClient: boolean;
};

export const TodayReplies = ({ replies, showClient }: Props) => {
  const breached = replies.filter((reply) => reply.level === 'BREACHED');
  const unowned = replies.filter((reply) => !reply.owner);

  return (
    <StyledSection id="replies">
      <StyledSectionHead>
        <StyledSectionTitle>Replies waiting</StyledSectionTitle>
        <StyledSectionMeta>
          {replies.length === 0
            ? 'nothing waiting'
            : `${replies.length} open · ${breached.length} past ${REPLY_SLA_WORKING_HOURS} working hours · ${unowned.length} unassigned`}
        </StyledSectionMeta>
      </StyledSectionHead>

      {replies.length === 0 ? (
        <StyledEmpty>
          Every reply has been answered. Replies appear here the moment one is
          recorded, and stay until the task carrying them is marked done.
        </StyledEmpty>
      ) : (
        <>
          <StyledScroller>
            <StyledTable>
              <thead>
                <tr>
                  <th>Who replied</th>
                  {showClient && <th>Client</th>}
                  <th>Owner</th>
                  <th data-numeric="true">Waiting</th>
                  <th>Arrived</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {replies.map((reply) => (
                  <tr key={reply.id}>
                    <td data-strong="true">
                      {reply.contact}
                      {(reply.jobTitle || reply.company) && (
                        <>
                          {' '}
                          <StyledHint>
                            {[reply.jobTitle, reply.company]
                              .filter(Boolean)
                              .join(' · ')}
                          </StyledHint>
                        </>
                      )}
                    </td>
                    {showClient && <td>{reply.client ?? '—'}</td>}
                    <td>
                      {reply.owner ?? (
                        <StyledChip data-tone="risk">
                          nobody&rsquo;s job
                        </StyledChip>
                      )}
                    </td>
                    <td data-numeric="true">
                      <StyledChip data-tone={TONE[reply.level]}>
                        {formatWait(reply.waitingHours)}
                      </StyledChip>
                    </td>
                    <td>{agoWords(reply.arrivedAt)}</td>
                    <td>
                      {STATUS_WORDS[reply.status ?? ''] ?? reply.status ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </StyledScroller>

          <StyledNote>
            Waiting is counted in working hours — Monday to Friday,{' '}
            {WORK_START_HOUR}:00 to {WORK_END_HOUR}:00 in your own timezone — so
            a reply that arrived on Friday evening is not called late on Monday
            morning. A day here is {WORK_END_HOUR - WORK_START_HOUR} of those
            hours, not twenty-four.
          </StyledNote>
        </>
      )}
    </StyledSection>
  );
};
