import { useMemo } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

// ── The masked team inbox — the reads ────────────────────────────────────────────────────────────
//
// Two custom objects carry it, and neither has a column that could hold a phone number, an email or
// a profile link. The Mac keeps the only mapping from a code back to a person; this page never asks
// for it, which is why an employee can work a conversation without being able to take it away.
//
// Visibility is not this page's job either: an employee's role carries a record scope on
// `assignedTo`, so the same query returns their threads and nobody else's. A filter in the UI would
// be a suggestion; the scope is in the SQL.

export const TEAM_INBOX_THREAD = 'inboxThread';
export const TEAM_INBOX_MESSAGE = 'inboxMessage';

export type TeamInboxThread = ObjectRecord & {
  id: string;
  code: string;
  channel: string | null;
  contactAlias: string | null;
  client: string | null;
  assignedTo: string | null;
  threadStatus: string | null;
  lastMessageAt: string | null;
  flag: string | null;
};

export type TeamInboxMessage = ObjectRecord & {
  id: string;
  threadCode: string | null;
  direction: string | null;
  body: string | null;
  sentAt: string | null;
  state: string | null;
  blockReason: string | null;
};

const THREAD_FIELDS = {
  id: true,
  code: true,
  channel: true,
  contactAlias: true,
  client: true,
  assignedTo: true,
  threadStatus: true,
  lastMessageAt: true,
  flag: true,
};

const MESSAGE_FIELDS = {
  id: true,
  threadCode: true,
  direction: true,
  body: true,
  sentAt: true,
  state: true,
  blockReason: true,
};

export const useTeamInboxThreads = () => {
  const { records, loading, refetch } = useFindManyRecords<TeamInboxThread>({
    objectNameSingular: TEAM_INBOX_THREAD,
    orderBy: [{ lastMessageAt: 'DescNullsLast' }],
    recordGqlFields: THREAD_FIELDS,
    limit: 200,
  });

  return { threads: records ?? [], loading, refetch };
};

/**
 * The newest messages across every thread the reader can see, for the preview line in the list.
 * Reading only the OPEN thread's messages was the first version, and it showed "No messages yet"
 * against every other conversation — a list that lies about what is in it is worse than no preview.
 * The record scope still applies, so this can never surface a thread they cannot open.
 */
export const useTeamInboxRecentMessages = () => {
  const { records, loading } = useFindManyRecords<TeamInboxMessage>({
    objectNameSingular: TEAM_INBOX_MESSAGE,
    orderBy: [{ sentAt: 'DescNullsLast' }],
    recordGqlFields: MESSAGE_FIELDS,
    limit: 200,
  });

  return { recentMessages: records ?? [], loading };
};

export const useTeamInboxMessages = (threadCode?: string) => {
  const { records, loading, refetch } = useFindManyRecords<TeamInboxMessage>({
    objectNameSingular: TEAM_INBOX_MESSAGE,
    filter: threadCode ? { threadCode: { eq: threadCode } } : undefined,
    orderBy: [{ sentAt: 'AscNullsFirst' }],
    recordGqlFields: MESSAGE_FIELDS,
    limit: 300,
    skip: !threadCode,
  });

  return { messages: records ?? [], loading, refetch };
};

/**
 * The last thing said in a thread, for the preview line. Messages are already scoped to the reader,
 * so a preview can never leak a thread they cannot open.
 */
export const useThreadPreviews = (messages: TeamInboxMessage[]) =>
  useMemo(() => {
    const byThread = new Map<string, TeamInboxMessage>();
    for (const message of messages) {
      const code = message.threadCode ?? '';
      const current = byThread.get(code);
      if (!current || (message.sentAt ?? '') > (current.sentAt ?? '')) {
        byThread.set(code, message);
      }
    }
    return byThread;
  }, [messages]);
