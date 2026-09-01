import { styled } from '@linaria/react';
import { type ChangeEvent, type MouseEvent } from 'react';
import { IconArchive, IconArchiveOff } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type TeamInboxMessage,
  type TeamInboxThread,
} from '@/team-inbox/hooks/useTeamInbox';
import {
  channelLabel,
  groupByDay,
  initialOf,
  previewOf,
  timeOfDay,
} from '@/team-inbox/utils/teamInboxFormat';
import { type ThreadUnread } from '@/team-inbox/utils/teamInboxReadState';

const StyledColumn = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 320px;
`;

const StyledHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledSearch = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  outline: none;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledFilter = styled.select`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  outline: none;
  padding: ${themeCssVariables.spacing[1]};

  /* Native <option>s take the OS colours unless told otherwise: on the dark theme they rendered
     light grey on light grey (Abrar's screenshot, 2026-09-01). Paint them with the app's own tokens. */
  option {
    background: ${themeCssVariables.background.primary};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledScroll = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const StyledDayLabel = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]}
    ${themeCssVariables.spacing[1]};
`;

// The row is a button, so the archive control cannot live inside it — a button inside a button is
// invalid, and React says so at runtime. They are siblings in a wrapper instead, and the wrapper
// carries the hover and selected paint that the row used to carry itself.
const StyledRowWrap = styled.div`
  align-items: center;
  border-left: 2px solid transparent;
  display: flex;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

const StyledRowWrapSelected = styled(StyledRowWrap)`
  background: ${themeCssVariables.background.transparent.light};
  border-left: 2px solid ${themeCssVariables.color.blue};
`;

const StyledRow = styled.button`
  align-items: flex-start;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  flex: 1;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[2]}
    ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  text-align: left;
`;

const StyledRowAction = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.light};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  margin-right: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]};

  &:hover {
    background: ${themeCssVariables.background.transparent.medium};
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledAvatar = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.medium};
  border-radius: ${themeCssVariables.border.radius.rounded};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 28px;
  justify-content: center;
  width: 28px;
`;

const StyledRowBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledRowTop = styled.div`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledNameUnread = styled(StyledName)`
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledStamp = styled.span`
  color: ${themeCssVariables.font.color.light};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledPreview = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledPreviewUnread = styled(StyledPreview)`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledMetaRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-width: 0;
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Priority is the one word a reply queue needs at a glance (HubSpot's inbox shows the same, 2026-09-01).
const StyledPriority = styled.span<{ level: 'URGENT' | 'HIGH' }>`
  border: 1px solid ${({ level }) => (level === 'URGENT' ? themeCssVariables.color.red : themeCssVariables.color.orange)};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ level }) => (level === 'URGENT' ? themeCssVariables.color.red : themeCssVariables.color.orange)};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1;
  padding: 2px ${themeCssVariables.spacing[1]};
  text-transform: lowercase;
`;

const StyledUnreadCount = styled.span`
  background: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.inverted};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1;
  padding: 3px 6px;
`;

const StyledUnreadDot = styled.span`
  background: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.rounded};
  flex-shrink: 0;
  height: 8px;
  width: 8px;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[3]};
  text-align: center;
`;

export type ThreadFilter =
  | 'all'
  | 'open'
  | 'waiting'
  | 'flagged'
  | 'urgent'
  | 'high'
  | 'archived';

const priorityOf = (thread: TeamInboxThread): 'URGENT' | 'HIGH' | null => {
  const level = (thread.priority ?? '').toUpperCase();
  return level === 'URGENT' || level === 'HIGH' ? level : null;
};

const isArchived = (thread: TeamInboxThread): boolean =>
  (thread.threadStatus ?? '').toUpperCase() === 'CLOSED';

type Props = {
  threads: TeamInboxThread[];
  previews: Map<string, TeamInboxMessage>;
  unread: Map<string, ThreadUnread>;
  loading: boolean;
  selectedCode?: string;
  search: string;
  filter: ThreadFilter;
  onSearch: (value: string) => void;
  onFilter: (value: ThreadFilter) => void;
  onSelect: (thread: TeamInboxThread) => void;
  onArchive: (thread: TeamInboxThread, archived: boolean) => void;
};

export const TeamInboxThreadList = ({
  threads,
  previews,
  unread,
  loading,
  selectedCode,
  search,
  filter,
  onSearch,
  onFilter,
  onSelect,
  onArchive,
}: Props) => {
  const needle = search.trim().toLowerCase();
  const visible = threads.filter((thread) => {
    // Archived means put away, not unshared: the thread is still theirs to open, still scoped to
    // them, and the Mac still mirrors into it. It is only out of the way until they ask for it.
    if (filter === 'archived') {
      if (!isArchived(thread)) return false;
    } else if (isArchived(thread)) {
      return false;
    }

    if (filter === 'flagged' && !thread.flag) return false;
    if (filter === 'open' && (thread.threadStatus ?? 'OPEN').toUpperCase() !== 'OPEN') return false;
    if (filter === 'urgent' && priorityOf(thread) !== 'URGENT') return false;
    if (filter === 'high' && priorityOf(thread) !== 'HIGH') return false;
    // "Waiting" means the other person spoke last and nobody has answered — the queue that matters.
    if (filter === 'waiting') {
      const last = previews.get(thread.code);
      if (!last || (last.direction ?? '') !== 'IN') return false;
    }
    if (!needle) return true;
    const haystack = [
      thread.contactAlias,
      thread.code,
      thread.client,
      previews.get(thread.code)?.body,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });

  const groups = groupByDay(visible, (thread) => thread.lastMessageAt);

  // Say what is actually true of this list, rather than one shrug that covers four situations.
  const emptyLine = () => {
    // Only the first load has nothing to show. A refetch over threads that are already on screen is
    // not "loading" to the person reading, so it must not overwrite a truer line.
    if (loading && threads.length === 0) return 'Loading conversations…';
    if (threads.length === 0) {
      return 'No conversation has been shared with you yet.';
    }
    if (needle !== '') return 'Nothing matches that.';
    switch (filter) {
      case 'waiting':
        return 'Nobody is waiting on a reply.';
      case 'open':
        return 'Nothing is open.';
      case 'flagged':
        return 'Nothing is flagged.';
      case 'urgent':
        return 'Nothing is urgent.';
      case 'high':
        return 'Nothing is marked high priority.';
      case 'archived':
        return 'Nothing has been archived.';
      default:
        return 'Every conversation here is archived — the Archived filter shows them.';
    }
  };

  return (
    <StyledColumn>
      <StyledHeader>
        <StyledFilter
          value={filter}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onFilter(event.target.value as ThreadFilter)
          }
          aria-label="Filter conversations"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="waiting">Waiting</option>
          <option value="flagged">Flagged</option>
          <option value="urgent">Urgent</option>
          <option value="high">High priority</option>
          <option value="archived">Archived</option>
        </StyledFilter>
        <StyledSearch
          value={search}
          placeholder="Search"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onSearch(event.target.value)
          }
          aria-label="Search conversations"
        />
      </StyledHeader>

      <StyledScroll>
        {visible.length === 0 && <StyledEmpty>{emptyLine()}</StyledEmpty>}

        {groups.map((group) => (
          <div key={group.key}>
            <StyledDayLabel>
              {group.label} · {group.rows.length}
            </StyledDayLabel>
            {group.rows.map((thread) => {
              const Wrap =
                thread.code === selectedCode
                  ? StyledRowWrapSelected
                  : StyledRowWrap;
              const last = previews.get(thread.code);
              const state = unread.get(thread.code) ?? {
                unread: false,
                count: 0,
              };
              const isUnread = state.unread;
              const Name = isUnread ? StyledNameUnread : StyledName;
              const Preview = isUnread ? StyledPreviewUnread : StyledPreview;
              const archived = isArchived(thread);
              const priority = priorityOf(thread);
              const waiting = (thread.threadStatus ?? '').toUpperCase() === 'WAITING';

              return (
                <Wrap key={thread.id}>
                  <StyledRow type="button" onClick={() => onSelect(thread)}>
                    <StyledAvatar>
                      {initialOf(thread.contactAlias)}
                    </StyledAvatar>
                    <StyledRowBody>
                      <StyledRowTop>
                        <Name>{thread.contactAlias ?? thread.code}</Name>
                        <StyledStamp>
                          {timeOfDay(thread.lastMessageAt)}
                        </StyledStamp>
                      </StyledRowTop>
                      <Preview>
                        {previewOf(last?.body) || 'No messages yet'}
                      </Preview>
                      <StyledMetaRow>
                        <StyledMeta>
                          {channelLabel(thread.channel)}
                          {thread.client
                            ? ` · ${thread.client.toLowerCase()}`
                            : ''}
                          {thread.flag ? ' · flagged' : ''}
                          {waiting ? ' · waiting' : ''}
                          {archived ? ' · archived' : ''}
                        </StyledMeta>
                        {priority && (
                          <StyledPriority level={priority} title={`${priority.toLowerCase()} priority`}>
                            {priority}
                          </StyledPriority>
                        )}
                        {isUnread &&
                          (state.count > 0 ? (
                            <StyledUnreadCount
                              title={`${state.count} unread`}
                              aria-label={`${state.count} unread`}
                            >
                              {state.count > 99 ? '99+' : state.count}
                            </StyledUnreadCount>
                          ) : (
                            <StyledUnreadDot
                              title="Unread"
                              aria-label="Unread"
                            />
                          ))}
                      </StyledMetaRow>
                    </StyledRowBody>
                  </StyledRow>
                  <StyledRowAction
                    type="button"
                    title={
                      archived
                        ? 'Put it back in the inbox'
                        : 'Archive — hides it from your list, changes nothing for them'
                    }
                    aria-label={
                      archived ? 'Restore conversation' : 'Archive conversation'
                    }
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      onArchive(thread, !archived);
                    }}
                  >
                    {archived ? (
                      <IconArchiveOff size={14} />
                    ) : (
                      <IconArchive size={14} />
                    )}
                  </StyledRowAction>
                </Wrap>
              );
            })}
          </div>
        ))}
      </StyledScroll>
    </StyledColumn>
  );
};
