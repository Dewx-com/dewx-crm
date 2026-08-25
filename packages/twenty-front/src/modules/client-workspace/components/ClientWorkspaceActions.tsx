import {
  StyledBanner,
  StyledChip,
  StyledColumn,
  StyledColumns,
  StyledEmpty,
  StyledListMeta,
  StyledListName,
  StyledListRow,
  StyledNote,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
  StyledSubTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import { type TaskRow } from '@/client-workspace/hooks/useClientWorkspace';
import {
  dayStamp,
  isOpen,
  isOverdue,
  OWNER_WORDS,
  ownerOf,
  type ActionOwner,
  type Signal,
  type SignalLevel,
} from '@/client-workspace/utils/clientWorkspaceModel';

// ── Actions and risks ───────────────────────────────────────────────────────────────────────────
//
// Three columns because outreach stalls in exactly one place: a thing that needs the client and has
// no owner written down. Splitting the board by who has to move makes that visible in a glance
// instead of in a fortnight, and a client who reads only one section of this page should read this
// one.
//
// The risk panel is measured first and written second. Everything derived from the data — paused
// campaigns, missing exclusions, an overdue report — recomputes itself and disappears when it is
// fixed. Risks copied from the published plan or report sit underneath, in the words that were
// agreed.

const ORDER: ActionOwner[] = ['PE', 'CLIENT', 'JOINT'];

const STATUS_WORDS: Record<string, string> = {
  TODO: 'to do',
  IN_PROGRESS: 'in progress',
  DONE: 'done',
};

const TONE: Record<SignalLevel, string> = { RISK: 'risk', WATCH: 'watch', CALM: 'calm' };

type Props = { tasks: TaskRow[]; signals: Signal[] };

export const ClientWorkspaceActions = ({ tasks, signals }: Props) => {
  const byOwner = new Map<ActionOwner, Array<{ task: TaskRow; text: string }>>();
  for (const owner of ORDER) byOwner.set(owner, []);
  for (const task of tasks) {
    const { owner, text } = ownerOf(task.title);
    byOwner.get(owner)?.push({ task, text });
  }

  const open = tasks.filter(isOpen).length;
  const overdue = tasks.filter((task) => isOverdue(task)).length;

  return (
    <>
      <StyledSection id="actions">
        <StyledSectionHead>
          <StyledSectionTitle>Actions</StyledSectionTitle>
          <StyledSectionMeta>
            {open} open{overdue > 0 ? ` · ${overdue} past the agreed date` : ''}
          </StyledSectionMeta>
        </StyledSectionHead>

        {tasks.length === 0 ? (
          <StyledEmpty>No actions are recorded for this workspace yet.</StyledEmpty>
        ) : (
          <StyledColumns>
            {ORDER.map((owner) => {
              const rows = byOwner.get(owner) ?? [];
              return (
                <StyledColumn key={owner}>
                  <StyledSubTitle>{OWNER_WORDS[owner]}</StyledSubTitle>
                  {rows.length === 0 && <StyledListMeta>Nothing outstanding.</StyledListMeta>}
                  {rows.map(({ task, text }) => (
                    <StyledListRow key={task.id}>
                      <StyledListName>{text}</StyledListName>
                      <StyledListMeta>
                        <StyledChip
                          data-tone={
                            (task.status ?? '').toUpperCase() === 'DONE'
                              ? 'calm'
                              : isOverdue(task)
                                ? 'watch'
                                : undefined
                          }
                        >
                          {STATUS_WORDS[(task.status ?? '').toUpperCase()] ?? task.status ?? '—'}
                        </StyledChip>
                        <br />
                        {task.dueAt ? dayStamp(task.dueAt) : 'no date'}
                      </StyledListMeta>
                    </StyledListRow>
                  ))}
                </StyledColumn>
              );
            })}
          </StyledColumns>
        )}

        <StyledNote>
          Actions are grouped by who has to move next. Anything in your column is what we are waiting
          on; anything in ours is what you are waiting on.
        </StyledNote>
      </StyledSection>

      <StyledSection id="risks">
        <StyledSectionHead>
          <StyledSectionTitle>Risks</StyledSectionTitle>
          <StyledSectionMeta>
            {signals.length === 0 ? 'nothing flagged' : `${signals.length} flagged`}
          </StyledSectionMeta>
        </StyledSectionHead>

        {signals.length === 0 ? (
          <StyledEmpty>
            Nothing measured here is off track: campaigns are running, the figures are fresh and the
            reporting is up to date.
          </StyledEmpty>
        ) : (
          signals.map((signal) => (
            <StyledBanner key={signal.key} data-tone={TONE[signal.level]}>
              <span>{signal.text}</span>
            </StyledBanner>
          ))
        )}
      </StyledSection>
    </>
  );
};
