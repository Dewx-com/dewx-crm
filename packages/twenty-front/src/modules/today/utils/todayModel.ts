import { daysSince } from '@/client-workspace/utils/clientWorkspaceModel';
import {
  type TodayOpportunity,
  type TodayPerson,
  type TodayTask,
} from '@/today/hooks/useToday';

// ── The daily screen — the arithmetic ───────────────────────────────────────────────────────────
//
// Every number the page shows is computed here from records the reader can open, so a figure they
// doubt can be clicked through to the rows behind it. Nothing is stored twice and nothing is
// estimated.
//
// Three things in this file exist because the data was measured first and disagreed with the
// obvious implementation. Each is marked where it is used, and none of them should be "simplified"
// away without measuring again:
//
//   1. A reply task has no relation to the person who replied. Measured 2026-08-22: 0 of 84 tasks
//      titled "Reply from …" carried a single taskTarget. The only join is the name in the title.
//   2. That join has to collapse whitespace. Matching the raw title against the person's name
//      resolved 79 of 84; collapsing runs of spaces resolved 84 of 84, because five contacts were
//      imported with a trailing space in the first name ("Tina  Gerbec").
//   3. There is no stage-entry clock. `updatedAt` is rewritten by every import run — 488 of 500
//      opportunities had been written by the API within the previous 0.73 days — so a staleness
//      measured from it is always zero. `createdAt` is the only field with real spread (median 30
//      days), and `stageClockOf` explains what stands in for the clock we do not have.

// ── Working hours ───────────────────────────────────────────────────────────────────────────────
//
// A reply that arrives at 18:30 on Friday has not been ignored by Monday at 09:00, and a screen
// that says it has will be switched off within the week. Working hours are Monday to Friday,
// 09:00–18:00, in the reader's own timezone — the same clock they are sitting in.

export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 18;
export const WORKING_HOURS_PER_DAY = WORK_END_HOUR - WORK_START_HOUR;

/** Past this, a reply is the first thing to look at. */
export const REPLY_SLA_WORKING_HOURS = 4;

/**
 * The walk is bounded rather than open-ended: anything waiting longer than this is already far past
 * every threshold on the page, and the ranking it lands in does not change. Left unbounded, one row
 * with a broken date would spin the loop for as many days as the error was wide.
 */
const MAX_DAYS_WALKED = 120;

export const workingHoursSince = (
  iso: string | null | undefined,
  now: Date = new Date(),
): number | null => {
  if (!iso) return null;
  const from = new Date(iso);
  if (Number.isNaN(from.getTime())) return null;
  if (from >= now) return 0;

  let hours = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  for (let day = 0; day < MAX_DAYS_WALKED && cursor <= now; day += 1) {
    const weekday = cursor.getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    if (!isWeekend) {
      const opens = new Date(cursor);
      opens.setHours(WORK_START_HOUR, 0, 0, 0);
      const closes = new Date(cursor);
      closes.setHours(WORK_END_HOUR, 0, 0, 0);

      const start = from > opens ? from : opens;
      const end = now < closes ? now : closes;
      if (end > start) hours += (end.getTime() - start.getTime()) / 3_600_000;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return hours;
};

/** A day here is nine working hours, not twenty-four, so the two never have to be reconciled. */
export const formatWait = (hours: number | null): string => {
  if (hours === null) return '—';
  if (hours < 0.5) return 'just now';
  if (hours < WORKING_HOURS_PER_DAY) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / WORKING_HOURS_PER_DAY);
  const rest = Math.round(hours - days * WORKING_HOURS_PER_DAY);
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
};

// ── Replies ─────────────────────────────────────────────────────────────────────────────────────

export const REPLY_TITLE_PREFIX = 'reply from ';
const DONE = 'DONE';

export const collapseSpaces = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

/** The key both sides of the name join are reduced to. See note 2 at the top of this file. */
export const personKey = (value: string | null | undefined): string =>
  collapseSpaces(value).toLowerCase();

export const isReplyTask = (task: TodayTask): boolean =>
  collapseSpaces(task.title).toLowerCase().startsWith(REPLY_TITLE_PREFIX);

export const isAnswered = (task: TodayTask): boolean =>
  (task.status ?? '').toUpperCase() === DONE;

/** "Reply from  Tina  Gerbec" → "Tina Gerbec". */
export const contactNameOf = (title: string | null | undefined): string =>
  collapseSpaces(collapseSpaces(title).slice(REPLY_TITLE_PREFIX.length));

export const fullNameOf = (
  name:
    | { firstName?: string | null; lastName?: string | null }
    | null
    | undefined,
): string => collapseSpaces(`${name?.firstName ?? ''} ${name?.lastName ?? ''}`);

export type WaitLevel = 'BREACHED' | 'DUE' | 'FRESH';

export const waitLevelOf = (hours: number | null): WaitLevel => {
  if (hours === null) return 'FRESH';
  if (hours > REPLY_SLA_WORKING_HOURS) return 'BREACHED';
  if (hours > REPLY_SLA_WORKING_HOURS / 2) return 'DUE';
  return 'FRESH';
};

export type WaitingReply = {
  id: string;
  contact: string;
  jobTitle: string | null;
  company: string | null;
  client: string | null;
  owner: string | null;
  status: string | null;
  arrivedAt: string | null;
  waitingHours: number | null;
  level: WaitLevel;
};

/**
 * Every reply still open, longest wait first. The person lookup only adds who the contact is — a
 * reply with no matching person still appears, under the name in its title, because a row that
 * quietly vanishes because of a failed join is worse than a row with a thin description.
 */
export const waitingRepliesOf = ({
  tasks,
  people,
  now = new Date(),
}: {
  tasks: TodayTask[];
  people: TodayPerson[];
  now?: Date;
}): WaitingReply[] => {
  const byName = new Map<string, TodayPerson>();
  for (const person of people) {
    const key = personKey(fullNameOf(person.name));
    if (key && !byName.has(key)) byName.set(key, person);
  }

  return tasks
    .filter((task) => isReplyTask(task) && !isAnswered(task))
    .map((task) => {
      const contact = contactNameOf(task.title);
      const person = byName.get(personKey(contact));
      const waitingHours = workingHoursSince(task.createdAt, now);

      return {
        id: task.id,
        contact: contact || 'Unnamed contact',
        jobTitle: person?.jobTitle ?? null,
        company: person?.company?.name ?? null,
        client: task.client ?? person?.client ?? null,
        owner: task.assignee ? fullNameOf(task.assignee.name) || null : null,
        status: task.status ?? null,
        arrivedAt: task.createdAt ?? null,
        waitingHours,
        level: waitLevelOf(waitingHours),
      };
    })
    .sort((a, b) => (b.waitingHours ?? 0) - (a.waitingHours ?? 0));
};

// ── Pipeline ────────────────────────────────────────────────────────────────────────────────────

/** How long a deal may sit in each stage before it is worth a second look. */
export const STAGE_LIMIT_DAYS: Record<string, number> = {
  NEW: 7,
  SCREENING: 5,
  MEETING: 3,
  PROPOSAL: 7,
};

/** CUSTOMER is deliberately absent: a won deal is not stalling, it has arrived. */
export const STAGE_ORDER = ['NEW', 'SCREENING', 'MEETING', 'PROPOSAL'];

export const STAGE_WORDS: Record<string, string> = {
  NEW: 'new',
  SCREENING: 'screening',
  MEETING: 'meeting',
  PROPOSAL: 'proposal',
  CUSTOMER: 'customer',
};

const MANUAL = 'MANUAL';

/**
 * The clock a stalled deal is measured against, and the honest answer to a field this CRM does not
 * have. There is no "entered this stage at", so:
 *
 *   - a row a person last touched by hand is measured from that touch, which is what lets a deal
 *     someone actually worked drop off this list instead of nagging forever;
 *   - every other row is measured from when it arrived, because its `updatedAt` says only when an
 *     import last ran over it.
 *
 * So the number means: this deal has been with us this long and is still at this stage. It does not
 * claim to know when the stage changed, and the page says as much where it prints it.
 */
export const stageClockOf = (opportunity: TodayOpportunity): string | null => {
  const touchedByHand = (opportunity.updatedBy?.source ?? '') === MANUAL;
  if (touchedByHand && opportunity.updatedAt) return opportunity.updatedAt;
  return opportunity.createdAt ?? opportunity.updatedAt ?? null;
};

export type StalledOpportunity = {
  id: string;
  name: string;
  stage: string;
  client: string | null;
  owner: string | null;
  company: string | null;
  daysInStage: number;
  limitDays: number;
  daysOver: number;
  hasCloseDate: boolean;
};

export const stalledOpportunitiesOf = ({
  opportunities,
  now = Date.now(),
}: {
  opportunities: TodayOpportunity[];
  now?: number;
}): StalledOpportunity[] =>
  opportunities
    .flatMap((opportunity) => {
      const stage = (opportunity.stage ?? '').toUpperCase();
      const limitDays = STAGE_LIMIT_DAYS[stage];
      if (limitDays === undefined) return [];

      const daysInStage = daysSince(stageClockOf(opportunity), now);
      if (daysInStage === null || daysInStage <= limitDays) return [];

      return [
        {
          id: opportunity.id,
          name: collapseSpaces(opportunity.name) || 'Unnamed opportunity',
          stage,
          client: opportunity.client ?? null,
          owner: opportunity.owner
            ? fullNameOf(opportunity.owner.name) || null
            : null,
          company: opportunity.company?.name ?? null,
          daysInStage,
          limitDays,
          daysOver: daysInStage - limitDays,
          hasCloseDate: Boolean(opportunity.closeDate),
        },
      ];
    })
    .sort((a, b) => b.daysOver - a.daysOver);

export type StageSummary = {
  stage: string;
  stalled: number;
  limitDays: number;
  oldestDays: number;
  unowned: number;
};

/**
 * The count per stage, which is the finding when the list is long. Measured 2026-08-22: 299 of 500
 * opportunities were past their stage limit and 263 of those were still at NEW — that is not 299
 * things to do today, it is one fact about a column nobody has triaged, and the page has to be able
 * to say it in a line rather than in three hundred rows.
 */
export const stageSummaryOf = (stalled: StalledOpportunity[]): StageSummary[] =>
  STAGE_ORDER.flatMap((stage) => {
    const rows = stalled.filter((row) => row.stage === stage);
    if (rows.length === 0) return [];
    return [
      {
        stage,
        stalled: rows.length,
        limitDays: STAGE_LIMIT_DAYS[stage],
        oldestDays: Math.max(...rows.map((row) => row.daysInStage)),
        unowned: rows.filter((row) => !row.owner).length,
      },
    ];
  });

// ── Clients ─────────────────────────────────────────────────────────────────────────────────────

export const WEEK_DAYS = 7;

/** The engagement is live, so silence from them counts against us. */
export const ENGAGED_STATUSES = ['ONBOARDING', 'ACTIVE'];

export type ClientDay = {
  scope: string;
  name: string;
  status: string | null;
  repliesThisWeek: number;
  openReplies: number;
  longestWaitHours: number | null;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
  openOpportunities: number;
  stalledOpportunities: number;
  contacts: number;
  quiet: boolean;
};

const laterOf = (
  a: string | null,
  b: string | null | undefined,
): string | null => {
  if (!b) return a;
  if (!a) return b;
  return a > b ? a : b;
};

/**
 * One row per client the reader can see, quietest first, which is the answer to "who is being
 * under-served". A client is quiet when nothing came back this week and there is a reason to expect
 * something: their engagement is live, or we hold contacts or open deals for them.
 *
 * The status half of that is not decoration. Measured 2026-08-22, two clients — both ACTIVE — had
 * no contacts, no deals and no replies at all, and a rule resting only on rows we hold called
 * neither of them quiet, so the page announced "0 quiet clients" directly above a table showing
 * them at the top with nothing in any column. A client we have not started is exactly the client
 * this section exists to name.
 *
 * Activity is the newest `createdAt` across their tasks and opportunities, never `updatedAt`: an
 * import rewrites `updatedAt` on every row it touches, so a client nobody has spoken to in a month
 * would read as touched this morning. See note 3 at the top of this file.
 */
export const clientDaysOf = ({
  tasks,
  opportunities,
  people,
  waiting,
  stalled,
  names,
  statuses,
  now = new Date(),
}: {
  tasks: TodayTask[];
  opportunities: TodayOpportunity[];
  people: TodayPerson[];
  waiting: WaitingReply[];
  stalled: StalledOpportunity[];
  names: Map<string, string>;
  statuses: Map<string, string | null>;
  now?: Date;
}): ClientDay[] => {
  const weekAgo = new Date(
    now.getTime() - WEEK_DAYS * 86_400_000,
  ).toISOString();
  const rows = new Map<string, ClientDay>();

  const rowFor = (scope: string | null | undefined): ClientDay | null => {
    if (!scope) return null;
    const held = rows.get(scope);
    if (held) return held;
    const fresh: ClientDay = {
      scope,
      name: names.get(scope) ?? scope,
      status: statuses.get(scope) ?? null,
      repliesThisWeek: 0,
      openReplies: 0,
      longestWaitHours: null,
      lastActivityAt: null,
      daysSinceActivity: null,
      openOpportunities: 0,
      stalledOpportunities: 0,
      contacts: 0,
      quiet: false,
    };
    rows.set(scope, fresh);
    return fresh;
  };

  // Every client with a record of its own gets a row, so a client we have gone quiet on cannot
  // disappear from the very table that exists to notice it.
  for (const scope of names.keys()) rowFor(scope);

  for (const task of tasks) {
    const row = rowFor(task.client);
    if (!row) continue;
    row.lastActivityAt = laterOf(row.lastActivityAt, task.createdAt);
    if (!isReplyTask(task)) continue;
    if ((task.createdAt ?? '') >= weekAgo) row.repliesThisWeek += 1;
  }

  for (const reply of waiting) {
    const row = rowFor(reply.client);
    if (!row) continue;
    row.openReplies += 1;
    if ((reply.waitingHours ?? 0) > (row.longestWaitHours ?? -1)) {
      row.longestWaitHours = reply.waitingHours;
    }
  }

  for (const opportunity of opportunities) {
    const row = rowFor(opportunity.client);
    if (!row) continue;
    row.lastActivityAt = laterOf(row.lastActivityAt, opportunity.createdAt);
    if ((opportunity.stage ?? '').toUpperCase() !== 'CUSTOMER')
      row.openOpportunities += 1;
  }

  for (const row of stalled) {
    const client = rowFor(row.client);
    if (client) client.stalledOpportunities += 1;
  }

  for (const person of people) {
    const row = rowFor(person.client);
    if (row) row.contacts += 1;
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      daysSinceActivity: daysSince(row.lastActivityAt, now.getTime()),
      quiet:
        row.repliesThisWeek === 0 &&
        (ENGAGED_STATUSES.includes((row.status ?? '').toUpperCase()) ||
          row.contacts > 0 ||
          row.openOpportunities > 0),
    }))
    .sort(
      (a, b) =>
        Number(b.quiet) - Number(a.quiet) ||
        a.repliesThisWeek - b.repliesThisWeek ||
        (b.daysSinceActivity ?? 0) - (a.daysSinceActivity ?? 0) ||
        a.name.localeCompare(b.name),
    );
};
