import { useMemo } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

// ── The client workspace — the reads ─────────────────────────────────────────────────────────────
//
// Six objects carry a client's workspace, and this hook asks for all six in the shape the page
// needs. Nothing here filters by client: a client's role carries a record scope on `client`, so the
// same queries return their rows and nobody else's. A filter written in the UI would be a
// suggestion; the scope is in the SQL. The client selector further down is a convenience for staff,
// who can see several, and it changes what is displayed, never what is permitted.
//
// Only fields that exist on the objects are requested — a name that is not in the metadata makes the
// whole GraphQL document fail, so this list is kept in step with the objects deliberately rather
// than generated. Fields that hold internal matter (a client's `notes`, a task's `bodyV2`) are not
// requested at all, so they cannot reach the page even by accident.

export const CLIENT = 'client';
export const CLIENT_PLAN = 'clientPlan';
export const CLIENT_REPORT = 'clientReport';
export const CAMPAIGN_SNAPSHOT = 'campaignSnapshot';
export const CLIENT_DELIVERABLE = 'clientDeliverable';
export const TASK = 'task';

/** DRAFT → APPROVED → PUBLISHED → ARCHIVED. Only the third is client-visible. */
export const PUBLISHED = 'PUBLISHED';

export type ClientRow = ObjectRecord & {
  id: string;
  name: string | null;
  slug: string | null;
  client: string | null;
  status: string | null;
  startDate: string | null;
  heyreachWorkspace: string | null;
  icp: string | null;
};

export type PlanRow = ObjectRecord & {
  id: string;
  client: string | null;
  title: string | null;
  version: string | null;
  status: string | null;
  effectiveFrom: string | null;
  objective: string | null;
  icp: string | null;
  markets: string | null;
  exclusions: string | null;
  positioning: string | null;
  channels: string | null;
  phases: string | null;
  successMeasures: string | null;
  risks: string | null;
  decisionsNeeded: string | null;
  sourceUpdatedAt: string | null;
  createdAt: string | null;
};

export type ReportRow = ObjectRecord & {
  id: string;
  client: string | null;
  title: string | null;
  status: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  executiveSummary: string | null;
  invitations: number | null;
  accepts: number | null;
  flowsStarted: number | null;
  messagesSent: number | null;
  replies: number | null;
  qualifiedLeads: number | null;
  meetingsBooked: number | null;
  lastActivityAt: string | null;
  measuredAt: string | null;
  analysis: string | null;
  risks: string | null;
  recommendations: string | null;
  changesSincePrior: string | null;
  createdAt: string | null;
};

export type SnapshotRow = ObjectRecord & {
  id: string;
  client: string | null;
  campaignExternalId: string | null;
  campaignName: string | null;
  market: string | null;
  segment: string | null;
  companySize: string | null;
  status: string | null;
  publicationStatus: string | null;
  senderName: string | null;
  invitations: number | null;
  accepts: number | null;
  messages: number | null;
  flows: number | null;
  replies: number | null;
  pending: number | null;
  inProgress: number | null;
  finished: number | null;
  failed: number | null;
  dncProtected: boolean | null;
  crossCampaignProtected: boolean | null;
  lastActivityAt: string | null;
  measuredAt: string | null;
  createdAt: string | null;
};

export type DeliverableRow = ObjectRecord & {
  id: string;
  client: string | null;
  title: string | null;
  deliverableType: string | null;
  status: string | null;
  deliveredAt: string | null;
  safeLink: {
    primaryLinkLabel?: string | null;
    primaryLinkUrl?: string | null;
  } | null;
  clientVisible: boolean | null;
  createdAt: string | null;
};

export type TaskRow = ObjectRecord & {
  id: string;
  client: string | null;
  title: string | null;
  status: string | null;
  workType: string | null;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/** One client the reader is allowed to see, and the three names it answers to. */
export type ClientEntry = {
  /** The record-scope value stamped on every row, e.g. the SELECT option. */
  scope: string;
  /** The URL segment: `/client/<slug>`. */
  slug: string;
  /** What a human calls them. */
  name: string;
  status: string | null;
  startDate: string | null;
  heyreachWorkspace: string | null;
};

const CLIENT_FIELDS = {
  id: true,
  name: true,
  slug: true,
  client: true,
  status: true,
  startDate: true,
  heyreachWorkspace: true,
  icp: true,
};

const PLAN_FIELDS = {
  id: true,
  client: true,
  title: true,
  version: true,
  status: true,
  effectiveFrom: true,
  objective: true,
  icp: true,
  markets: true,
  exclusions: true,
  positioning: true,
  channels: true,
  phases: true,
  successMeasures: true,
  risks: true,
  decisionsNeeded: true,
  sourceUpdatedAt: true,
  createdAt: true,
};

const REPORT_FIELDS = {
  id: true,
  client: true,
  title: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  executiveSummary: true,
  invitations: true,
  accepts: true,
  flowsStarted: true,
  messagesSent: true,
  replies: true,
  qualifiedLeads: true,
  meetingsBooked: true,
  lastActivityAt: true,
  measuredAt: true,
  analysis: true,
  risks: true,
  recommendations: true,
  changesSincePrior: true,
  createdAt: true,
};

const SNAPSHOT_FIELDS = {
  id: true,
  client: true,
  campaignExternalId: true,
  campaignName: true,
  market: true,
  segment: true,
  companySize: true,
  status: true,
  publicationStatus: true,
  senderName: true,
  invitations: true,
  accepts: true,
  messages: true,
  flows: true,
  replies: true,
  pending: true,
  inProgress: true,
  finished: true,
  failed: true,
  dncProtected: true,
  crossCampaignProtected: true,
  lastActivityAt: true,
  measuredAt: true,
  createdAt: true,
};

const DELIVERABLE_FIELDS = {
  id: true,
  client: true,
  title: true,
  deliverableType: true,
  status: true,
  deliveredAt: true,
  safeLink: true,
  clientVisible: true,
  createdAt: true,
};

const TASK_FIELDS = {
  id: true,
  client: true,
  title: true,
  status: true,
  workType: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * A record-scope value turned into a URL segment: `MCS_MICROMINDER` → `mcs-microminder`. Only used
 * when a client has no `client` record of its own to give a real slug, which happens while a client
 * is being set up and its rows arrive before its row does.
 */
export const slugOfScope = (scope: string): string =>
  scope
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** `MCS_MICROMINDER` → `Mcs Microminder`, the last-resort display name for the same case. */
export const nameOfScope = (scope: string): string =>
  scope
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const useClientWorkspace = () => {
  const { records: clientRecords, loading: clientsLoading } =
    useFindManyRecords<ClientRow>({
      objectNameSingular: CLIENT,
      orderBy: [{ name: 'AscNullsLast' }],
      recordGqlFields: CLIENT_FIELDS,
      limit: 200,
    });

  const { records: plans, loading: plansLoading } = useFindManyRecords<PlanRow>(
    {
      objectNameSingular: CLIENT_PLAN,
      orderBy: [{ effectiveFrom: 'DescNullsLast' }],
      recordGqlFields: PLAN_FIELDS,
      limit: 200,
    },
  );

  const { records: reports, loading: reportsLoading } =
    useFindManyRecords<ReportRow>({
      objectNameSingular: CLIENT_REPORT,
      orderBy: [{ periodEnd: 'DescNullsLast' }],
      recordGqlFields: REPORT_FIELDS,
      limit: 200,
    });

  const { records: snapshots, loading: snapshotsLoading } =
    useFindManyRecords<SnapshotRow>({
      objectNameSingular: CAMPAIGN_SNAPSHOT,
      orderBy: [{ measuredAt: 'DescNullsLast' }],
      recordGqlFields: SNAPSHOT_FIELDS,
      limit: 500,
    });

  const { records: deliverables, loading: deliverablesLoading } =
    useFindManyRecords<DeliverableRow>({
      objectNameSingular: CLIENT_DELIVERABLE,
      orderBy: [{ deliveredAt: 'DescNullsLast' }],
      recordGqlFields: DELIVERABLE_FIELDS,
      limit: 200,
    });

  const { records: tasks, loading: tasksLoading } = useFindManyRecords<TaskRow>(
    {
      objectNameSingular: TASK,
      orderBy: [{ dueAt: 'AscNullsLast' }],
      recordGqlFields: TASK_FIELDS,
      limit: 300,
    },
  );

  /**
   * Who the reader may look at. The `client` records are the good source because they carry the
   * slug and the human name; anything scoped to a client with no record of its own still gets an
   * entry, derived from its scope value, so a workspace never silently disappears from the list.
   */
  const directory = useMemo<ClientEntry[]>(() => {
    const byScope = new Map<string, ClientEntry>();

    for (const row of clientRecords ?? []) {
      const scope = row.client ?? '';
      if (!scope) continue;
      byScope.set(scope, {
        scope,
        slug: (row.slug ?? '').trim() || slugOfScope(scope),
        name: (row.name ?? '').trim() || nameOfScope(scope),
        status: row.status ?? null,
        startDate: row.startDate ?? null,
        heyreachWorkspace: row.heyreachWorkspace ?? null,
      });
    }

    const scoped: Array<{ client?: string | null }> = [
      ...(plans ?? []),
      ...(reports ?? []),
      ...(snapshots ?? []),
      ...(deliverables ?? []),
      ...(tasks ?? []),
    ];
    for (const row of scoped) {
      const scope = row.client ?? '';
      if (!scope || byScope.has(scope)) continue;
      byScope.set(scope, {
        scope,
        slug: slugOfScope(scope),
        name: nameOfScope(scope),
        status: null,
        startDate: null,
        heyreachWorkspace: null,
      });
    }

    return [...byScope.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientRecords, plans, reports, snapshots, deliverables, tasks]);

  return {
    directory,
    plans: plans ?? [],
    reports: reports ?? [],
    snapshots: snapshots ?? [],
    deliverables: deliverables ?? [],
    tasks: tasks ?? [],
    loading:
      clientsLoading ||
      plansLoading ||
      reportsLoading ||
      snapshotsLoading ||
      deliverablesLoading ||
      tasksLoading,
  };
};
