import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { TeamInboxContextPanel } from '@/team-inbox/components/TeamInboxContextPanel';
import { TeamInboxConversation } from '@/team-inbox/components/TeamInboxConversation';
import {
  TeamInboxThreadList,
  type ThreadFilter,
} from '@/team-inbox/components/TeamInboxThreadList';
import {
  TEAM_INBOX_MESSAGE,
  TEAM_INBOX_THREAD,
  useTeamInboxMessages,
  useTeamInboxRecentMessages,
  useTeamInboxThreads,
  type TeamInboxMessage,
  type TeamInboxThread,
} from '@/team-inbox/hooks/useTeamInbox';
import { useTeamInboxReadState } from '@/team-inbox/hooks/useTeamInboxReadState';
import {
  readThroughStamp,
  unreadByThread,
} from '@/team-inbox/utils/teamInboxReadState';

// ── The masked team inbox ────────────────────────────────────────────────────────────────────────
//
// Three panes, the same shape as the inbox on the Mac: conversations on the left, the conversation
// in the middle, who it is on the right. The difference is deliberate and is the whole point — this
// copy holds no phone number, no email and no profile link, so an employee can work a conversation
// they could not otherwise be trusted with, and cannot take it anywhere.
//
// A reply written here is not sent from here. It is stored as QUEUED and the Mac that owns the
// account picks it up, checks it, and sends it on that account within a couple of minutes. If it
// carries an identifier or an attempt to move off-channel it comes back BLOCKED with the reason,
// which is why the composer warns before the words are gone rather than after.
//
// Nothing filters the list by employee: their role carries a record scope on `assignedTo`, so the
// query itself returns their threads and nobody else's. A UI filter would be a suggestion.
//
// Read and archived are two different kinds of thing and are stored in two different places. Read
// belongs to the reader, so it lives in their browser; archived belongs to the conversation, so it
// is `threadStatus = CLOSED` on the record, which every one of their devices then agrees with.

const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  border-left: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
`;

export const TeamInboxPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ThreadFilter>('all');
  const [sending, setSending] = useState(false);

  const {
    threads,
    loading: threadsLoading,
    refetch: refetchThreads,
  } = useTeamInboxThreads();
  const selected = useMemo(
    () => threads.find((thread) => thread.code === code) ?? threads[0],
    [threads, code],
  );

  const {
    messages,
    loading: messagesLoading,
    refetch,
  } = useTeamInboxMessages(selected?.code);
  const { recentMessages } = useTeamInboxRecentMessages();
  const { createOneRecord } = useCreateOneRecord<TeamInboxMessage>({
    objectNameSingular: TEAM_INBOX_MESSAGE,
  });
  const { updateOneRecord } = useUpdateOneRecord();
  const { openedAt, markRead } = useTeamInboxReadState();

  // The newest message of EVERY thread, not only the open one, so the list reads correctly before
  // anything is clicked. The open thread's own messages are folded in on top because they are
  // always the freshest — a reply just written shows in the list immediately.
  const pool = useMemo(
    () => [...recentMessages, ...messages],
    [recentMessages, messages],
  );

  const previews = useMemo(() => {
    const map = new Map<string, TeamInboxMessage>();
    for (const message of pool) {
      const key = message.threadCode ?? '';
      const current = map.get(key);
      if (!current || (message.sentAt ?? '') > (current.sentAt ?? ''))
        map.set(key, message);
    }
    return map;
  }, [pool]);

  const unread = useMemo(
    () => unreadByThread(threads, pool, openedAt),
    [threads, pool, openedAt],
  );

  useEffect(() => {
    if (selected && selected.code !== code) {
      navigate(`/inbox/${selected.code}`, { replace: true });
    }
  }, [selected, code, navigate]);

  // Open is read. Marking through the newest stamp in the thread rather than "now" means a message
  // that lands while it is open is read too, and one that lands after it is closed is not.
  useEffect(() => {
    if (!selected) return;
    markRead(selected.code, readThroughStamp(selected, messages));
  }, [selected, messages, markRead]);

  const send = async (text: string) => {
    if (!selected) return;
    setSending(true);
    try {
      await createOneRecord({
        name: `${selected.code} ${new Date().toISOString().slice(0, 16)}`,
        threadCode: selected.code,
        direction: 'OUT',
        body: text,
        state: 'QUEUED',
        sentAt: new Date().toISOString(),
        client: selected.client,
        assignedTo: selected.assignedTo,
      } as Partial<TeamInboxMessage>);
      await refetch?.();
    } finally {
      setSending(false);
    }
  };

  // Archiving puts a conversation away; it does not unshare it. The record keeps the same scope, the
  // Mac keeps mirroring into it, and the Archived filter brings it back — which is why this writes
  // threadStatus and never touches who can see the row.
  const setArchived = async (thread: TeamInboxThread, archived: boolean) => {
    await updateOneRecord<TeamInboxThread>({
      objectNameSingular: TEAM_INBOX_THREAD,
      idToUpdate: thread.id,
      updateOneRecordInput: { threadStatus: archived ? 'CLOSED' : 'OPEN' },
    });
    await refetchThreads?.();
  };

  return (
    <StyledPage>
      <TeamInboxThreadList
        threads={threads}
        previews={previews}
        unread={unread}
        loading={threadsLoading}
        selectedCode={selected?.code}
        search={search}
        filter={filter}
        onSearch={setSearch}
        onFilter={setFilter}
        onSelect={(thread) => navigate(`/inbox/${thread.code}`)}
        onArchive={(thread, archived) => void setArchived(thread, archived)}
      />
      <TeamInboxConversation
        thread={selected}
        messages={messages}
        loading={messagesLoading}
        sending={sending}
        onSend={send}
      />
      <TeamInboxContextPanel thread={selected} messages={messages} />
    </StyledPage>
  );
};
