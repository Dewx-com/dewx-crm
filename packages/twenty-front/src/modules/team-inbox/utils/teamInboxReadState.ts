import {
  type TeamInboxMessage,
  type TeamInboxThread,
} from '@/team-inbox/hooks/useTeamInbox';

// ── Which conversations this reader has already read ────────────────────────────────────────────
//
// There is no unread column on inboxThread, and adding one would be a lie: unread is not a fact
// about a conversation, it is a fact about a reader. Two people share a thread and each has their
// own honest answer. So it is kept per viewer, in this browser, as one timestamp per thread code —
// the moment that reader last had the thread open — and a thread is unread when something came IN
// after that moment.
//
// Nothing is written to the server. A different browser therefore starts with nothing stored and
// shows everything as unread, which is the true answer for that browser: nothing has been read
// there. Every access is wrapped, because a private window can throw on the first touch of
// localStorage rather than politely returning null, and a thrown storage call must never be the
// reason an inbox fails to render.

const STORAGE_KEY = 'pe-crm.team-inbox.opened-at.v1';

export type OpenedAtByThread = Record<string, string>;

export type ThreadUnread = {
  unread: boolean;
  /** 0 means "unread, but we cannot honestly count it" — see unreadByThread. */
  count: number;
};

/**
 * Milliseconds since the epoch, or 0 for anything missing or unparseable. Stamps reach this page in
 * more than one ISO flavour (the server's, and the one this browser writes), and comparing those as
 * strings quietly gets the order wrong.
 */
export const stampMs = (iso: string | null | undefined): number => {
  if (!iso) return 0;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
};

export const readOpenedAt = (): OpenedAtByThread => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const opened: OpenedAtByThread = {};
    for (const [code, at] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof at === 'string' && stampMs(at) > 0) opened[code] = at;
    }
    return opened;
  } catch {
    // A private window, storage switched off, or somebody else's JSON sitting in our key. No stored
    // value is a valid state — every thread simply reads as unread — so this is never an error.
    return {};
  }
};

export const writeOpenedAt = (openedAt: OpenedAtByThread): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openedAt));
  } catch {
    // Storage full, blocked, or private. The markers are a convenience; losing them costs a stale
    // dot and nothing else, so failing loudly here would be worse than failing quietly.
  }
};

/**
 * The stamp a thread has been read up to once it has been opened: the newest thing in it, whether
 * that is the thread's own `lastMessageAt` or a message that arrived after it. Marking with "now"
 * instead would swallow a message that lands in the same second as the click.
 */
export const readThroughStamp = (
  thread: TeamInboxThread,
  messages: TeamInboxMessage[],
): string => {
  let newest = stampMs(thread.lastMessageAt);
  for (const message of messages) {
    if (message.threadCode !== thread.code) continue;
    newest = Math.max(newest, stampMs(message.sentAt));
  }
  return newest > 0 ? new Date(newest).toISOString() : new Date().toISOString();
};

/**
 * Unread state per thread code.
 *
 * The count is the number of INCOMING messages newer than the moment this reader last had the
 * thread open — our own replies are not news to us. It is counted from the messages actually
 * loaded, which is the newest 200 across every thread plus the whole of the open one, so an old
 * conversation can be unread without a number: `count: 0` with `unread: true` means "something came
 * in after you last looked, but the messages that prove it are outside the window we loaded". That
 * renders as a dot rather than a wrong number.
 */
export const unreadByThread = (
  threads: TeamInboxThread[],
  pool: TeamInboxMessage[],
  openedAt: OpenedAtByThread,
): Map<string, ThreadUnread> => {
  const countByCode = new Map<string, number>();
  const codesWithIncoming = new Set<string>();

  for (const message of pool) {
    if ((message.direction ?? '') !== 'IN') continue;

    const code = message.threadCode ?? '';
    codesWithIncoming.add(code);
    if (stampMs(message.sentAt) > stampMs(openedAt[code])) {
      countByCode.set(code, (countByCode.get(code) ?? 0) + 1);
    }
  }

  const unread = new Map<string, ThreadUnread>();
  for (const thread of threads) {
    const count = countByCode.get(thread.code) ?? 0;
    const nothingLoaded = !codesWithIncoming.has(thread.code);
    const staleByThreadStamp =
      nothingLoaded &&
      stampMs(thread.lastMessageAt) > stampMs(openedAt[thread.code]);

    unread.set(thread.code, {
      unread: count > 0 || staleByThreadStamp,
      count,
    });
  }
  return unread;
};
