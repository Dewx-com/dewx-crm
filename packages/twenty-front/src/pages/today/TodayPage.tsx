import { styled } from '@linaria/react';
import { useMemo } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  StyledBanner,
  StyledBigNumber,
  StyledBody,
  StyledCard,
  StyledCardGrid,
  StyledCardHint,
  StyledCardLabel,
  StyledChip,
  StyledChipRow,
  StyledEmpty,
  StyledNote,
  StyledPage,
  StyledSection,
  StyledSectionTitle,
  StyledTextButton,
  StyledTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import { dayStamp } from '@/client-workspace/utils/clientWorkspaceModel';
import { TodayClients } from '@/today/components/TodayClients';
import { TodayPipeline } from '@/today/components/TodayPipeline';
import { TodayReplies } from '@/today/components/TodayReplies';
import { isPartial, useToday } from '@/today/hooks/useToday';
import {
  clientDaysOf,
  formatWait,
  REPLY_SLA_WORKING_HOURS,
  stageSummaryOf,
  stalledOpportunitiesOf,
  waitingRepliesOf,
} from '@/today/utils/todayModel';

// ── Today ───────────────────────────────────────────────────────────────────────────────────────
//
// One screen for the three questions a morning actually has, in the order a morning has them:
//
//   1. Who is waiting on us, whose job is it, and how long have they been waiting.
//   2. Which deals have stopped moving.
//   3. Which client is being under-served.
//
// It exists because all three were true and none of them were visible: they lived in a markdown
// file and in one person's head, and a fact that lives there is rediscovered every morning at the
// cost of an hour. Everything here is counted from the records at the moment the page loads —
// nothing is copied into a summary that can drift away from the rows behind it.
//
// The page is deliberately generic, and no client is named in it. A client signing in sees their
// own rows because their role carries a record scope, and the same code renders for them; staff see
// everyone's. The one thing that changes is whether a client column is worth drawing, and that is
// decided by whether more than one client is visible — the same scope that decides what the queries
// return, so it can never disagree with the data.

const StyledHeader = styled.div`
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]}
    ${themeCssVariables.spacing[3]};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const StyledHeaderTop = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledJumps = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const JUMPS = [
  { id: 'replies', label: 'Replies' },
  { id: 'pipeline', label: 'Stopped moving' },
  { id: 'clients', label: 'Clients' },
];

const jumpTo = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export const TodayPage = () => {
  const { tasks, opportunities, people, names, statuses, coverage, loading } =
    useToday();

  const waiting = useMemo(
    () => waitingRepliesOf({ tasks, people }),
    [tasks, people],
  );
  const stalled = useMemo(
    () => stalledOpportunitiesOf({ opportunities }),
    [opportunities],
  );
  const summary = useMemo(() => stageSummaryOf(stalled), [stalled]);
  const clients = useMemo(
    () =>
      clientDaysOf({
        tasks,
        opportunities,
        people,
        waiting,
        stalled,
        names,
        statuses,
      }),
    [tasks, opportunities, people, waiting, stalled, names, statuses],
  );

  const breached = waiting.filter((reply) => reply.level === 'BREACHED');
  const unassigned = waiting.filter((reply) => !reply.owner);
  const unowned = stalled.filter((row) => !row.owner);
  const quiet = clients.filter((row) => row.quiet);
  const longest = waiting[0];

  // More than one client visible means staff. It is the only signal this page needs, and it comes
  // from the same record scope that decides what the queries return.
  const showClient = clients.length > 1;

  const partial = [
    isPartial(coverage.tasks)
      ? `tasks ${coverage.tasks.read} of ${coverage.tasks.total}`
      : null,
    isPartial(coverage.opportunities)
      ? `deals ${coverage.opportunities.read} of ${coverage.opportunities.total}`
      : null,
    isPartial(coverage.people)
      ? `contacts ${coverage.people.read} of ${coverage.people.total}`
      : null,
  ].filter(Boolean);

  const nothingToShow =
    !loading &&
    waiting.length === 0 &&
    stalled.length === 0 &&
    clients.length === 0;

  return (
    <StyledPage>
      <StyledHeader>
        <StyledHeaderTop>
          <StyledTitle>Today</StyledTitle>
          <StyledJumps>
            {JUMPS.map((jump) => (
              <StyledTextButton key={jump.id} onClick={() => jumpTo(jump.id)}>
                {jump.label}
              </StyledTextButton>
            ))}
          </StyledJumps>
        </StyledHeaderTop>

        <StyledChipRow>
          <StyledChip>{dayStamp(new Date().toISOString())}</StyledChip>
          {breached.length > 0 && (
            <StyledChip data-tone="risk">
              {breached.length} past {REPLY_SLA_WORKING_HOURS} working hours
            </StyledChip>
          )}
          {unassigned.length > 0 && (
            <StyledChip data-tone="risk">
              {unassigned.length} unassigned
            </StyledChip>
          )}
          {quiet.length > 0 && (
            <StyledChip data-tone="watch">
              {quiet.length} quiet clients
            </StyledChip>
          )}
        </StyledChipRow>
      </StyledHeader>

      <StyledBody>
        {loading && waiting.length === 0 && stalled.length === 0 && (
          <StyledEmpty>Counting what is waiting…</StyledEmpty>
        )}

        {nothingToShow && (
          <StyledEmpty>
            Nothing is waiting, nothing has stalled, and no client has any
            records yet. If you expected to see work here, your access has not
            been set up.
          </StyledEmpty>
        )}

        {partial.length > 0 && (
          <StyledBanner data-tone="watch">
            <span>
              This page has read {partial.join(', ')}. Every count below is
              taken from what was read, so treat them as a floor rather than a
              total until the rest is paged in.
            </span>
          </StyledBanner>
        )}

        <StyledCardGrid>
          <StyledCard>
            <StyledBigNumber>{waiting.length}</StyledBigNumber>
            <StyledCardLabel>replies waiting</StyledCardLabel>
            <StyledCardHint>
              {breached.length} past {REPLY_SLA_WORKING_HOURS} working hours
            </StyledCardHint>
          </StyledCard>

          <StyledCard>
            <StyledBigNumber>
              {formatWait(longest?.waitingHours ?? null)}
            </StyledBigNumber>
            <StyledCardLabel>longest wait</StyledCardLabel>
            <StyledCardHint>
              {longest ? longest.contact : 'nobody is waiting'}
            </StyledCardHint>
          </StyledCard>

          <StyledCard>
            <StyledBigNumber>{unassigned.length}</StyledBigNumber>
            <StyledCardLabel>nobody&rsquo;s job</StyledCardLabel>
            <StyledCardHint>replies with no owner</StyledCardHint>
          </StyledCard>

          <StyledCard>
            <StyledBigNumber>{stalled.length}</StyledBigNumber>
            <StyledCardLabel>deals stopped moving</StyledCardLabel>
            <StyledCardHint>
              {unowned.length} of them with no owner
            </StyledCardHint>
          </StyledCard>

          <StyledCard>
            <StyledBigNumber>{quiet.length}</StyledBigNumber>
            <StyledCardLabel>quiet clients</StyledCardLabel>
            <StyledCardHint>nothing came back this week</StyledCardHint>
          </StyledCard>
        </StyledCardGrid>

        <TodayReplies replies={waiting} showClient={showClient} />

        <TodayPipeline
          stalled={stalled}
          summary={summary}
          showClient={showClient}
        />

        <TodayClients clients={clients} />

        <StyledSection id="how-to-read">
          <StyledSectionTitle>How to read this page</StyledSectionTitle>
          <StyledNote>
            A reply is anything recorded as a task titled &ldquo;Reply from
            …&rdquo;, and it stays here until that task is marked done. Marking
            it done is what clears it — nothing on this page watches whether an
            answer was actually sent, so the list is only as honest as the
            people closing it.
          </StyledNote>
          <StyledNote>
            The name in the title is also the only link back to the contact,
            because a reply task carries no relation to the person who sent it.
            Where that name matches somebody on file their role and company are
            shown beside it; where it does not, the name stands alone rather
            than the row disappearing.
          </StyledNote>
          <StyledNote>
            Counts are taken from the records as they were when this page
            loaded. Reload it to recount. Nothing here is stored, so there is no
            summary that can quietly fall out of step with the rows underneath
            it.
          </StyledNote>
        </StyledSection>
      </StyledBody>
    </StyledPage>
  );
};
