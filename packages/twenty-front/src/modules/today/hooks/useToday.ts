import { useMemo } from 'react';

import { nameOfScope } from '@/client-workspace/hooks/useClientWorkspace';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

// ── The daily screen — the reads ────────────────────────────────────────────────────────────────
//
// Four objects, asked for in the shape the morning needs: the replies waiting (task), the deals
// that have stopped moving (opportunity), who the reply is from (person), and what each client is
// called (client).
//
// Nothing here filters by client, and nothing filters by employee. The reader's role carries a
// record scope, so these same queries return their rows and nobody else's — a client signing in
// gets their own workspace's replies and deals, staff get everyone's. A filter written in the UI
// would be a suggestion; the scope is in the SQL.
//
// Only fields that exist on the objects are requested. A name that is not in the metadata makes the
// whole GraphQL document fail, so this list is kept in step with the objects deliberately rather
// than generated, and `task.bodyV2` — the body of a reply, which can carry anything — is not
// requested at all, so it cannot reach the page even by accident.

const PERSON = 'person';
const OPPORTUNITY = 'opportunity';
const TASK = 'task';
const CLIENT = 'client';

/**
 * One page each. The server honours these — measured 2026-08-22, `people(first:1000)` returned all
 * 823 rows in one response — but the counts on this page are only as true as their coverage, so
 * every hook returns `totalCount` beside the rows and the page says so when it has read fewer than
 * exist rather than quietly under-reporting.
 */
const PAGE = 1000;

type FullName = { firstName?: string | null; lastName?: string | null };

export type TodayTask = ObjectRecord & {
  id: string;
  title: string | null;
  status: string | null;
  workType: string | null;
  client: string | null;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignee: { id: string; name: FullName | null } | null;
};

export type TodayOpportunity = ObjectRecord & {
  id: string;
  name: string | null;
  stage: string | null;
  client: string | null;
  closeDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: { source: string | null; name: string | null } | null;
  owner: { id: string; name: FullName | null } | null;
  company: { id: string; name: string | null } | null;
};

export type TodayPerson = ObjectRecord & {
  id: string;
  client: string | null;
  jobTitle: string | null;
  createdAt: string | null;
  name: FullName | null;
  company: { id: string; name: string | null } | null;
};

export type TodayClientRow = ObjectRecord & {
  id: string;
  name: string | null;
  slug: string | null;
  client: string | null;
  status: string | null;
};

const TASK_FIELDS = {
  id: true,
  title: true,
  status: true,
  workType: true,
  client: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
  assignee: { id: true, name: true },
};

const OPPORTUNITY_FIELDS = {
  id: true,
  name: true,
  stage: true,
  client: true,
  closeDate: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
  owner: { id: true, name: true },
  company: { id: true, name: true },
};

const PERSON_FIELDS = {
  id: true,
  client: true,
  jobTitle: true,
  createdAt: true,
  name: true,
  company: { id: true, name: true },
};

const CLIENT_FIELDS = {
  id: true,
  name: true,
  slug: true,
  client: true,
  status: true,
};

export type Coverage = { read: number; total: number | null };

const coverageOf = (read: number, total: number | undefined): Coverage => ({
  read,
  total: typeof total === 'number' ? total : null,
});

export const isPartial = (coverage: Coverage): boolean =>
  coverage.total !== null && coverage.read < coverage.total;

export const useToday = () => {
  const {
    records: tasks,
    totalCount: taskCount,
    loading: tasksLoading,
  } = useFindManyRecords<TodayTask>({
    objectNameSingular: TASK,
    orderBy: [{ createdAt: 'DescNullsLast' }],
    recordGqlFields: TASK_FIELDS,
    limit: PAGE,
  });

  const {
    records: opportunities,
    totalCount: opportunityCount,
    loading: opportunitiesLoading,
  } = useFindManyRecords<TodayOpportunity>({
    objectNameSingular: OPPORTUNITY,
    orderBy: [{ createdAt: 'AscNullsLast' }],
    recordGqlFields: OPPORTUNITY_FIELDS,
    limit: PAGE,
  });

  const {
    records: people,
    totalCount: personCount,
    loading: peopleLoading,
  } = useFindManyRecords<TodayPerson>({
    objectNameSingular: PERSON,
    orderBy: [{ createdAt: 'DescNullsLast' }],
    recordGqlFields: PERSON_FIELDS,
    limit: PAGE,
  });

  const { records: clientRecords, loading: clientsLoading } = useFindManyRecords<TodayClientRow>({
    objectNameSingular: CLIENT,
    orderBy: [{ name: 'AscNullsLast' }],
    recordGqlFields: CLIENT_FIELDS,
    limit: 200,
  });

  /**
   * What each client is called, and whether their engagement is live. Only four of the fourteen
   * clients stamped on rows had a record of their own when this was written, so a scope with no
   * record still gets a readable name derived from the scope value rather than being printed as
   * `MCS_MICROMINDER`, and a status of null — which is not the same as a client we know is paused.
   */
  const { names, statuses } = useMemo(() => {
    const names = new Map<string, string>();
    const statuses = new Map<string, string | null>();

    for (const row of clientRecords ?? []) {
      const scope = row.client ?? '';
      if (!scope) continue;
      names.set(scope, (row.name ?? '').trim() || nameOfScope(scope));
      statuses.set(scope, row.status ?? null);
    }
    for (const row of [...(tasks ?? []), ...(opportunities ?? []), ...(people ?? [])]) {
      const scope = row.client ?? '';
      if (scope && !names.has(scope)) names.set(scope, nameOfScope(scope));
    }
    return { names, statuses };
  }, [clientRecords, tasks, opportunities, people]);

  return {
    tasks: tasks ?? [],
    opportunities: opportunities ?? [],
    people: people ?? [],
    names,
    statuses,
    coverage: {
      tasks: coverageOf((tasks ?? []).length, taskCount),
      opportunities: coverageOf((opportunities ?? []).length, opportunityCount),
      people: coverageOf((people ?? []).length, personCount),
    },
    loading: tasksLoading || opportunitiesLoading || peopleLoading || clientsLoading,
  };
};
