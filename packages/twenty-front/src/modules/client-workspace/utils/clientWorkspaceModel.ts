import {
  PUBLISHED,
  type DeliverableRow,
  type PlanRow,
  type ReportRow,
  type SnapshotRow,
  type TaskRow,
} from '@/client-workspace/hooks/useClientWorkspace';

// ── The client workspace — the arithmetic ────────────────────────────────────────────────────────
//
// Every figure the page shows is computed here, from records the reader can already open, so a
// number they doubt can be clicked through to the rows behind it. Nothing is stored twice and
// nothing is estimated.
//
// Two rules this file exists to keep honest:
//
//   1. Volume is not success. Invitations and messages are work done; accepts and replies are
//      interest; qualified leads and meetings are the only results. Each funnel step carries the
//      band it belongs to so the page can never quietly present the first as the last.
//   2. Acceptance rate is always accepts ÷ invitations, computed here. `clientReport.acceptanceRate`
//      is deliberately not read: a stored rate can disagree with the two numbers printed beside it,
//      and when it does, the client is the one who notices.

export const isPublished = (status: string | null | undefined): boolean =>
  (status ?? '').toUpperCase() === PUBLISHED;

export const num = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const ratio = (part: number, whole: number): number | null =>
  whole > 0 ? (part / whole) * 100 : null;

export const formatPercent = (value: number | null): string =>
  value === null ? '—' : `${value.toFixed(1)}%`;

export const formatCount = (value: number): string => value.toLocaleString();

export const dayStamp = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const shortDay = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const daysSince = (iso: string | null | undefined, now = Date.now()): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const startOf = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  return Math.round((startOf(now) - startOf(then)) / 86_400_000);
};

export const agoWords = (iso: string | null | undefined, now = Date.now()): string => {
  const days = daysSince(iso, now);
  if (days === null) return '';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};

/** The later of two ISO stamps, either of which may be missing. */
const later = (a: string | null | undefined, b: string | null | undefined): string | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
};

export const paragraphsOf = (text: string | null | undefined): string[] =>
  (text ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

export const linesOf = (text: string | null | undefined): string[] =>
  (text ?? '')
    .split(/\n+/)
    .map((part) => part.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);

export const periodLabel = (report: ReportRow): string => {
  if (report.periodStart && report.periodEnd) {
    return `${shortDay(report.periodStart)} – ${dayStamp(report.periodEnd)}`;
  }
  if (report.periodEnd) return `to ${dayStamp(report.periodEnd)}`;
  if (report.periodStart) return `from ${dayStamp(report.periodStart)}`;
  return dayStamp(report.measuredAt ?? report.createdAt);
};

// ── Campaigns ───────────────────────────────────────────────────────────────────────────────────

const measuredKey = (row: SnapshotRow): string => row.measuredAt ?? row.createdAt ?? '';

/**
 * A campaign is measured again and again, so the table wants the newest row per campaign, not every
 * row ever written. Summing the raw table would count the same campaign once per measurement, which
 * is how a paused account comes to look busy.
 */
export const latestPerCampaign = (rows: SnapshotRow[]): SnapshotRow[] => {
  const newest = new Map<string, SnapshotRow>();
  for (const row of rows) {
    const key = row.campaignExternalId ?? row.campaignName ?? row.id;
    const held = newest.get(key);
    if (!held || measuredKey(row) > measuredKey(held)) newest.set(key, row);
  }
  return [...newest.values()].sort((a, b) =>
    (a.campaignName ?? '').localeCompare(b.campaignName ?? ''),
  );
};

export type CampaignTotals = {
  campaigns: number;
  active: number;
  paused: number;
  invitations: number;
  accepts: number;
  messages: number;
  flows: number;
  replies: number;
  pending: number;
  inProgress: number;
  unprotected: number;
  senders: string[];
  measuredAt: string | null;
  lastActivityAt: string | null;
};

export const totalsOf = (rows: SnapshotRow[]): CampaignTotals => {
  const totals: CampaignTotals = {
    campaigns: rows.length,
    active: 0,
    paused: 0,
    invitations: 0,
    accepts: 0,
    messages: 0,
    flows: 0,
    replies: 0,
    pending: 0,
    inProgress: 0,
    unprotected: 0,
    senders: [],
    measuredAt: null,
    lastActivityAt: null,
  };
  const senders = new Set<string>();

  for (const row of rows) {
    const status = (row.status ?? '').toUpperCase();
    if (status === 'ACTIVE') totals.active += 1;
    if (status === 'PAUSED') totals.paused += 1;
    totals.invitations += num(row.invitations);
    totals.accepts += num(row.accepts);
    totals.messages += num(row.messages);
    totals.flows += num(row.flows);
    totals.replies += num(row.replies);
    totals.pending += num(row.pending);
    totals.inProgress += num(row.inProgress);
    if (row.dncProtected !== true && row.crossCampaignProtected !== true) totals.unprotected += 1;
    if (row.senderName) senders.add(row.senderName);
    totals.measuredAt = later(totals.measuredAt, row.measuredAt);
    totals.lastActivityAt = later(totals.lastActivityAt, row.lastActivityAt);
  }

  totals.senders = [...senders].sort();
  return totals;
};

export type MarketRow = {
  market: string;
  campaigns: number;
  invitations: number;
  accepts: number;
  messages: number;
  flows: number;
  replies: number;
};

export const marketsOf = (rows: SnapshotRow[]): MarketRow[] => {
  const byMarket = new Map<string, MarketRow>();
  for (const row of rows) {
    const market = (row.market ?? '').trim() || 'Unspecified';
    const held =
      byMarket.get(market) ??
      { market, campaigns: 0, invitations: 0, accepts: 0, messages: 0, flows: 0, replies: 0 };
    held.campaigns += 1;
    held.invitations += num(row.invitations);
    held.accepts += num(row.accepts);
    held.messages += num(row.messages);
    held.flows += num(row.flows);
    held.replies += num(row.replies);
    byMarket.set(market, held);
  }
  return [...byMarket.values()].sort((a, b) => b.invitations - a.invitations);
};

// ── The funnel ──────────────────────────────────────────────────────────────────────────────────

export type FunnelBand = 'activity' | 'engagement' | 'qualified' | 'meeting';

export type FunnelStep = {
  key: string;
  label: string;
  value: number | null;
  band: FunnelBand;
  /** Where the number came from, in words, so it can be argued with. */
  source: string;
};

export const BAND_WORDS: Record<FunnelBand, string> = {
  activity: 'work done',
  engagement: 'interest',
  qualified: 'qualified',
  meeting: 'result',
};

/**
 * Live: activity and engagement come from the newest measurement of each campaign; qualified leads
 * and meetings are not measured by the campaign tool at all, so they come from the last published
 * report and say so. Nothing is carried across from one source to the other without a label.
 */
export const liveFunnel = (
  totals: CampaignTotals,
  report: ReportRow | undefined,
): FunnelStep[] => {
  const measured = totals.measuredAt ? `measured ${dayStamp(totals.measuredAt)}` : 'not yet measured';
  const fromReport = report
    ? `report ${periodLabel(report)}`
    : 'no published report yet';
  return [
    { key: 'invitations', label: 'Invitations sent', value: totals.invitations, band: 'activity', source: measured },
    { key: 'accepts', label: 'Invitations accepted', value: totals.accepts, band: 'engagement', source: measured },
    { key: 'flows', label: 'Sequences started', value: totals.flows, band: 'activity', source: measured },
    { key: 'messages', label: 'Messages sent', value: totals.messages, band: 'activity', source: measured },
    { key: 'replies', label: 'Replies received', value: totals.replies, band: 'engagement', source: measured },
    {
      key: 'qualified',
      label: 'Qualified leads',
      value: report ? num(report.qualifiedLeads) : null,
      band: 'qualified',
      source: fromReport,
    },
    {
      key: 'meetings',
      label: 'Meetings booked',
      value: report ? num(report.meetingsBooked) : null,
      band: 'meeting',
      source: fromReport,
    },
  ];
};

/** One published report, read on its own terms: every step from the same period, one source. */
export const reportFunnel = (report: ReportRow): FunnelStep[] => {
  const source = `report ${periodLabel(report)}`;
  return [
    { key: 'invitations', label: 'Invitations sent', value: num(report.invitations), band: 'activity', source },
    { key: 'accepts', label: 'Invitations accepted', value: num(report.accepts), band: 'engagement', source },
    { key: 'flows', label: 'Sequences started', value: num(report.flowsStarted), band: 'activity', source },
    { key: 'messages', label: 'Messages sent', value: num(report.messagesSent), band: 'activity', source },
    { key: 'replies', label: 'Replies received', value: num(report.replies), band: 'engagement', source },
    { key: 'qualified', label: 'Qualified leads', value: num(report.qualifiedLeads), band: 'qualified', source },
    { key: 'meetings', label: 'Meetings booked', value: num(report.meetingsBooked), band: 'meeting', source },
  ];
};

// ── The plan, and how far along it is ───────────────────────────────────────────────────────────

export type PhaseState = 'DONE' | 'ACTIVE' | 'TODO' | 'UNTRACKED';

export type Phase = {
  key: string;
  label: string;
  body: string;
  state: PhaseState;
  tasks: TaskRow[];
};

const PHASE_LABEL_MAX_WORDS = 3;
const PHASE_LABEL_MAX_CHARS = 40;

/**
 * A plan's phases are written as prose, one paragraph each, opening with the phase's name:
 * "Reconcile. Establish what actually happened…" or "1. Reconcile — confirm any offline replies".
 * A paragraph counts as a phase only when that opening name is short; anything longer is the
 * plan talking, and is returned as intro text rather than invented into a milestone.
 */
export const readPhases = (
  text: string | null | undefined,
): { intro: string[]; phases: Array<{ label: string; body: string }> } => {
  const intro: string[] = [];
  const phases: Array<{ label: string; body: string }> = [];

  for (const paragraph of paragraphsOf(text)) {
    const withoutNumber = paragraph.replace(/^\s*\d+\s*[.)]\s*/, '');
    const cut = withoutNumber.search(/[.:—]|\s-\s/);
    const label = cut > 0 ? withoutNumber.slice(0, cut).trim() : '';
    const shortEnough =
      label.length > 0 &&
      label.length <= PHASE_LABEL_MAX_CHARS &&
      label.split(/\s+/).length <= PHASE_LABEL_MAX_WORDS;

    if (shortEnough) {
      phases.push({
        label,
        body: withoutNumber
          .slice(cut)
          .replace(/^[.:—\s-]+/, '')
          .trim(),
      });
    } else {
      intro.push(paragraph);
    }
  }

  return { intro, phases };
};

/**
 * How far the plan has actually got, measured from tasks rather than asserted. A phase owns every
 * task whose title names it. A phase nobody has written a task for is UNTRACKED, and says so — the
 * alternative is a progress bar that moves because somebody edited a paragraph.
 */
export const phaseProgress = (
  planPhases: Array<{ label: string; body: string }>,
  tasks: TaskRow[],
): Phase[] =>
  planPhases.map((phase, index) => {
    const needle = phase.label.toLowerCase();
    const owned =
      needle.length >= 4
        ? tasks.filter((task) => (task.title ?? '').toLowerCase().includes(needle))
        : [];

    let state: PhaseState = 'UNTRACKED';
    if (owned.length > 0) {
      const done = owned.filter((task) => (task.status ?? '').toUpperCase() === 'DONE');
      const running = owned.filter((task) => (task.status ?? '').toUpperCase() === 'IN_PROGRESS');
      state = done.length === owned.length ? 'DONE' : running.length > 0 ? 'ACTIVE' : 'TODO';
    }

    return { key: `${index}-${phase.label}`, label: phase.label, body: phase.body, state, tasks: owned };
  });

export const currentPhase = (phases: Phase[]): Phase | undefined =>
  phases.find((phase) => phase.state !== 'DONE');

// ── Actions ─────────────────────────────────────────────────────────────────────────────────────

export type ActionOwner = 'PE' | 'CLIENT' | 'JOINT';

export const OWNER_WORDS: Record<ActionOwner, string> = {
  PE: 'Prospect Engine',
  CLIENT: 'Your side',
  JOINT: 'Together',
};

/**
 * Actions are written with their owner in front — "PE: …", "Client: …", "Joint: …" — because a task
 * list with no owner is a wish list. The prefix is stripped for display, so the board reads as
 * sentences rather than as labels repeated in every row.
 */
export const ownerOf = (title: string | null | undefined): { owner: ActionOwner; text: string } => {
  const raw = (title ?? '').trim();
  const match = raw.match(/^([A-Za-z][A-Za-z ‑-]{0,24}?)\s*:\s*(.*)$/);
  if (!match) return { owner: 'PE', text: raw };

  const head = match[1].trim().toLowerCase();
  const rest = match[2].trim() || raw;
  if (head === 'client' || head === 'customer') return { owner: 'CLIENT', text: rest };
  if (head === 'joint' || head === 'both' || head === 'together') return { owner: 'JOINT', text: rest };
  if (head === 'pe' || head === 'prospect engine' || head === 'us') return { owner: 'PE', text: rest };
  return { owner: 'PE', text: raw };
};

export const isOpen = (task: TaskRow): boolean => (task.status ?? '').toUpperCase() !== 'DONE';

export const isOverdue = (task: TaskRow, now = Date.now()): boolean =>
  isOpen(task) && !!task.dueAt && new Date(task.dueAt).getTime() < now;

/** The single next thing to do: the open action that runs out of time first. */
export const nextAction = (tasks: TaskRow[]): TaskRow | undefined => {
  const open = tasks.filter(isOpen);
  const dated = open
    .filter((task) => !!task.dueAt)
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
  return dated[0] ?? open[0];
};

/**
 * When the next report is due. A weekly rhythm means seven days after the last published period;
 * if nothing has been published yet, the due date of whichever open action is about publishing one.
 */
export const nextReportDue = (
  publishedReports: ReportRow[],
  tasks: TaskRow[],
): string | null => {
  const latest = publishedReports[0];
  if (latest?.periodEnd) {
    const end = new Date(latest.periodEnd).getTime();
    if (Number.isFinite(end)) return new Date(end + 7 * 86_400_000).toISOString();
  }
  const reportTask = tasks
    .filter((task) => isOpen(task) && !!task.dueAt && /report/i.test(task.title ?? ''))
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))[0];
  return reportTask?.dueAt ?? null;
};

// ── Health ──────────────────────────────────────────────────────────────────────────────────────

export type SignalLevel = 'RISK' | 'WATCH' | 'CALM';

export type Signal = { key: string; level: SignalLevel; text: string };

export const HEALTH_WORDS: Record<SignalLevel, string> = {
  RISK: 'Needs attention',
  WATCH: 'Watch',
  CALM: 'On track',
};

const STALE_MEASUREMENT_DAYS = 7;
const OVERDUE_REPORT_DAYS = 10;

/**
 * Every risk on this page is measured, not asserted: each one names the count or the date that
 * produced it, so it disappears on its own when the thing is fixed. A hand-written risk from the
 * published plan or report is added alongside, and marked as coming from there.
 */
export const signalsOf = ({
  snapshots,
  totals,
  publishedReports,
  publishedPlan,
  tasks,
  now = Date.now(),
}: {
  snapshots: SnapshotRow[];
  totals: CampaignTotals;
  publishedReports: ReportRow[];
  publishedPlan: PlanRow | undefined;
  tasks: TaskRow[];
  now?: number;
}): Signal[] => {
  const signals: Signal[] = [];

  if (totals.campaigns > 0 && totals.paused === totals.campaigns) {
    signals.push({
      key: 'all-paused',
      level: 'RISK',
      text: `All ${totals.campaigns} campaigns are paused. Nobody is being contacted right now.`,
    });
  } else if (totals.paused > 0) {
    signals.push({
      key: 'some-paused',
      level: 'WATCH',
      text: `${totals.paused} of ${totals.campaigns} campaigns are paused.`,
    });
  }

  if (totals.unprotected > 0) {
    signals.push({
      key: 'unprotected',
      level: 'RISK',
      text: `${totals.unprotected} campaigns have no exclusion list and no cross-campaign protection, so one person can be approached more than once.`,
    });
  }

  if (totals.senders.length === 1 && totals.campaigns > 1) {
    signals.push({
      key: 'one-sender',
      level: 'WATCH',
      text: `All ${totals.campaigns} campaigns send from one account (${totals.senders[0]}). If that account is restricted, everything stops at once.`,
    });
  }

  if (totals.messages > 0 && totals.replies === 0) {
    signals.push({
      key: 'no-replies',
      level: 'WATCH',
      text: `${formatCount(totals.messages)} messages sent and no reply recorded. Replies that happened off the platform still need to be confirmed.`,
    });
  }

  const measurementAge = daysSince(totals.measuredAt, now);
  if (snapshots.length > 0 && measurementAge !== null && measurementAge > STALE_MEASUREMENT_DAYS) {
    signals.push({
      key: 'stale',
      level: 'WATCH',
      text: `The campaign figures were last measured ${agoWords(totals.measuredAt, now)}.`,
    });
  }

  const latestReport = publishedReports[0];
  const reportAge = daysSince(latestReport?.periodEnd ?? latestReport?.createdAt, now);
  if (!latestReport) {
    signals.push({
      key: 'no-report',
      level: 'RISK',
      text: 'No report has been published yet, so there is no written account of the period.',
    });
  } else if (reportAge !== null && reportAge > OVERDUE_REPORT_DAYS) {
    signals.push({
      key: 'report-overdue',
      level: 'RISK',
      text: `The last published report covers up to ${dayStamp(latestReport.periodEnd ?? latestReport.createdAt)} — ${agoWords(latestReport.periodEnd ?? latestReport.createdAt, now)}.`,
    });
  }

  if (!publishedPlan) {
    signals.push({
      key: 'no-plan',
      level: 'WATCH',
      text: 'No plan is published, so the agreed objective and exclusions are not visible here yet.',
    });
  }

  const overdue = tasks.filter((task) => isOverdue(task, now));
  if (overdue.length > 0) {
    signals.push({
      key: 'overdue-actions',
      level: 'WATCH',
      text: `${overdue.length} ${overdue.length === 1 ? 'action is' : 'actions are'} past the agreed date.`,
    });
  }

  for (const [index, text] of linesOf(latestReport?.risks).entries()) {
    signals.push({ key: `report-risk-${index}`, level: 'WATCH', text });
  }
  for (const [index, text] of linesOf(publishedPlan?.risks).entries()) {
    signals.push({ key: `plan-risk-${index}`, level: 'WATCH', text });
  }

  return signals;
};

export const healthOf = (signals: Signal[]): SignalLevel => {
  if (signals.some((signal) => signal.level === 'RISK')) return 'RISK';
  if (signals.some((signal) => signal.level === 'WATCH')) return 'WATCH';
  return 'CALM';
};

// ── The activity log ────────────────────────────────────────────────────────────────────────────

export type Update = { key: string; at: string | null; kind: string; text: string };

/**
 * A dated log built only from published records and finished work — never from internal notes,
 * which is why it is safe to show a client. A record that has not been published has not happened
 * as far as this list is concerned.
 */
export const updatesOf = ({
  plans,
  reports,
  deliverables,
  tasks,
}: {
  plans: PlanRow[];
  reports: ReportRow[];
  deliverables: DeliverableRow[];
  tasks: TaskRow[];
}): Update[] => {
  const updates: Update[] = [];

  for (const plan of plans) {
    if (!isPublished(plan.status)) continue;
    updates.push({
      key: `plan-${plan.id}`,
      at: plan.effectiveFrom ?? plan.createdAt,
      kind: 'Plan',
      text: `${plan.title ?? 'Plan'}${plan.version ? ` (${plan.version})` : ''} published.`,
    });
  }

  for (const report of reports) {
    if (!isPublished(report.status)) continue;
    updates.push({
      key: `report-${report.id}`,
      at: report.periodEnd ?? report.createdAt,
      kind: 'Report',
      text: `Report published for ${periodLabel(report)}.`,
    });
  }

  for (const deliverable of deliverables) {
    if (!isPublished(deliverable.status) || deliverable.clientVisible !== true) continue;
    updates.push({
      key: `deliverable-${deliverable.id}`,
      at: deliverable.deliveredAt ?? deliverable.createdAt,
      kind: 'Delivered',
      text: deliverable.title ?? 'Deliverable',
    });
  }

  for (const task of tasks) {
    if ((task.status ?? '').toUpperCase() !== 'DONE') continue;
    updates.push({
      key: `task-${task.id}`,
      at: task.updatedAt ?? task.createdAt,
      kind: 'Done',
      text: ownerOf(task.title).text,
    });
  }

  return updates.sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')));
};
