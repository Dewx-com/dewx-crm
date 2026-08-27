import {
  StyledBanner,
  StyledBannerTitle,
  StyledBigNumber,
  StyledCard,
  StyledCardGrid,
  StyledCardHint,
  StyledCardLabel,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import {
  type ClientEntry,
  type ReportRow,
  type TaskRow,
} from '@/client-workspace/hooks/useClientWorkspace';
import {
  agoWords,
  dayStamp,
  formatCount,
  formatPercent,
  HEALTH_WORDS,
  isOverdue,
  num,
  OWNER_WORDS,
  ownerOf,
  periodLabel,
  ratio,
  type CampaignTotals,
  type Signal,
  type SignalLevel,
} from '@/client-workspace/utils/clientWorkspaceModel';

// ── Overview ────────────────────────────────────────────────────────────────────────────────────
//
// The first screen answers four questions in the order a person asks them: is this all right, where
// are we in the work, how fresh are these numbers, and what happens next. The loudest thing on the
// page is the worst measured signal, and the second loudest is the one action that is next — a
// dashboard that ranks nothing leaves the ranking to whoever is reading it.
//
// The KPI row deliberately separates work done from interest from results. Invitations sitting
// beside meetings, in the same size and colour, is the oldest way of making a quiet quarter look
// busy, so accepts carry their rate, replies stand on their own, and meetings are the last word.

const TONE: Record<SignalLevel, string> = {
  RISK: 'risk',
  WATCH: 'watch',
  CALM: 'calm',
};

const STATUS_WORDS: Record<string, string> = {
  ONBOARDING: 'Setting up',
  ACTIVE: 'Running',
  PAUSED: 'Paused',
  ENDED: 'Ended',
};

type Props = {
  entry: ClientEntry;
  totals: CampaignTotals;
  signals: Signal[];
  health: SignalLevel;
  latestReport: ReportRow | undefined;
  nextAction: TaskRow | undefined;
  nextReportAt: string | null;
  hasSnapshots: boolean;
};

export const ClientWorkspaceOverview = ({
  entry,
  totals,
  signals,
  health,
  latestReport,
  nextAction,
  nextReportAt,
  hasSnapshots,
}: Props) => {
  const loudest =
    signals.find((signal) => signal.level === 'RISK') ?? signals[0];
  const acceptance = ratio(totals.accepts, totals.invitations);
  const action = nextAction ? ownerOf(nextAction.title) : undefined;

  return (
    <StyledSection id="overview">
      <StyledSectionHead>
        <StyledSectionTitle>Overview</StyledSectionTitle>
        <StyledSectionMeta>
          {totals.measuredAt
            ? `campaign figures measured ${dayStamp(totals.measuredAt)}, ${agoWords(totals.measuredAt)}`
            : 'no campaign measurement recorded yet'}
        </StyledSectionMeta>
      </StyledSectionHead>

      {loudest && (
        <StyledBanner data-tone={TONE[loudest.level]}>
          <StyledBannerTitle>
            {loudest.level === 'RISK' ? 'Needs attention' : 'Worth knowing'}
          </StyledBannerTitle>
          <span>{loudest.text}</span>
        </StyledBanner>
      )}

      {action && nextAction && (
        <StyledBanner data-tone={isOverdue(nextAction) ? 'watch' : undefined}>
          <StyledBannerTitle>Next action</StyledBannerTitle>
          <span>{action.text}</span>
          <StyledCardHint>
            {OWNER_WORDS[action.owner]}
            {nextAction.dueAt
              ? ` · due ${dayStamp(nextAction.dueAt)}${isOverdue(nextAction) ? ' · past the agreed date' : ''}`
              : ' · no date agreed'}
          </StyledCardHint>
        </StyledBanner>
      )}

      <StyledCardGrid>
        <StyledCard>
          <StyledBigNumber>{HEALTH_WORDS[health]}</StyledBigNumber>
          <StyledCardLabel>Health</StyledCardLabel>
          <StyledCardHint>
            {signals.length === 0
              ? 'nothing measured is off track'
              : `${signals.length} ${signals.length === 1 ? 'signal' : 'signals'}, listed under Risks`}
          </StyledCardHint>
        </StyledCard>

        <StyledCard>
          <StyledBigNumber>
            {STATUS_WORDS[(entry.status ?? '').toUpperCase()] ??
              entry.status ??
              '—'}
          </StyledBigNumber>
          <StyledCardLabel>Stage</StyledCardLabel>
          <StyledCardHint>
            {entry.startDate
              ? `started ${dayStamp(entry.startDate)}`
              : 'no start date recorded'}
          </StyledCardHint>
        </StyledCard>

        <StyledCard>
          <StyledBigNumber>
            {totals.measuredAt ? agoWords(totals.measuredAt) : '—'}
          </StyledBigNumber>
          <StyledCardLabel>Figures measured</StyledCardLabel>
          <StyledCardHint>
            {totals.lastActivityAt
              ? `last campaign activity ${dayStamp(totals.lastActivityAt)}`
              : 'no campaign activity recorded'}
          </StyledCardHint>
        </StyledCard>

        <StyledCard>
          <StyledBigNumber>
            {nextReportAt ? dayStamp(nextReportAt) : '—'}
          </StyledBigNumber>
          <StyledCardLabel>Next report</StyledCardLabel>
          <StyledCardHint>
            {latestReport
              ? `last one covered ${periodLabel(latestReport)}`
              : 'nothing published yet'}
          </StyledCardHint>
        </StyledCard>
      </StyledCardGrid>

      <StyledCardGrid>
        <StyledCard>
          <StyledBigNumber>{formatCount(totals.campaigns)}</StyledBigNumber>
          <StyledCardLabel>Campaigns</StyledCardLabel>
          <StyledCardHint>
            {hasSnapshots
              ? `${totals.active} running, ${totals.paused} paused`
              : 'no measurement published'}
          </StyledCardHint>
        </StyledCard>

        <StyledCard>
          <StyledBigNumber>{formatCount(totals.invitations)}</StyledBigNumber>
          <StyledCardLabel>Invitations sent</StyledCardLabel>
          <StyledCardHint>work done, not a result</StyledCardHint>
        </StyledCard>

        <StyledCard>
          <StyledBigNumber>{formatCount(totals.accepts)}</StyledBigNumber>
          <StyledCardLabel>Connections accepted</StyledCardLabel>
          <StyledCardHint>
            {formatPercent(acceptance)} of invitations
          </StyledCardHint>
        </StyledCard>

        <StyledCard>
          <StyledBigNumber>{formatCount(totals.replies)}</StyledBigNumber>
          <StyledCardLabel>Replies</StyledCardLabel>
          <StyledCardHint>
            {totals.messages > 0
              ? `from ${formatCount(totals.messages)} messages`
              : 'no messages sent yet'}
          </StyledCardHint>
        </StyledCard>

        <StyledCard>
          <StyledBigNumber>
            {latestReport ? formatCount(num(latestReport.meetingsBooked)) : '—'}
          </StyledBigNumber>
          <StyledCardLabel>Meetings booked</StyledCardLabel>
          <StyledCardHint>
            {latestReport
              ? `report ${periodLabel(latestReport)}`
              : 'counted in a published report'}
          </StyledCardHint>
        </StyledCard>
      </StyledCardGrid>
    </StyledSection>
  );
};
