import {
  type OperationsWorkspaceCallbacks,
  type OperationsWorkspaceData,
} from '@/team-workspace/operations/operations-workspace-types';
import {
  groupTasksByStatus,
  pendingHandoffsForViewer,
} from '@/team-workspace/operations/utils/operationsWorkspaceModel';
import { OperationsHandoffCard } from './operations-handoff-card';
import { OperationsSectionShell } from './operations-section-shell';
import { OperationsTaskCard } from './operations-task-card';
import {
  StyledBoard,
  StyledBoardCards,
  StyledBoardColumn,
  StyledBoardHead,
  StyledPill,
} from './operations-workspace-elements';
import {
  StyledEmpty,
  StyledMetric,
  StyledMetricLabel,
  StyledMetrics,
  StyledMetricValue,
  StyledPanel,
  StyledPanelHead,
  StyledPanelTitle,
  StyledSection,
  StyledSectionHead,
  StyledSectionHint,
  StyledSectionTitle,
  StyledStack,
} from './operations-workspace-layout';

type OperationsWorkSectionProps = {
  data: OperationsWorkspaceData;
  now?: Date;
  callbacks: OperationsWorkspaceCallbacks;
};

const BOARD_COLUMNS = [
  { status: 'todo', label: 'To do', empty: 'No work is waiting to start.' },
  {
    status: 'in-progress',
    label: 'In progress',
    empty: 'No work is currently in progress.',
  },
  { status: 'blocked', label: 'Blocked', empty: 'Nothing is blocked.' },
  {
    status: 'done',
    label: 'Done',
    empty: 'Nothing has been completed yet.',
  },
] as const;

export const OperationsWorkSection = ({
  data,
  now = new Date(),
  callbacks,
}: OperationsWorkSectionProps) => {
  const board = groupTasksByStatus(data.tasks);
  const pendingHandoffs = pendingHandoffsForViewer(
    data.handoffs,
    data.viewer.id,
  );

  return (
    <OperationsSectionShell
      eyebrow={`${data.viewer.name} · Operations`}
      title="Work"
      lead="Move delivery from promise to proof. A task can only finish when its completion evidence is attached."
      headerAside={
        <StyledPill data-tone="info">Evidence required for Done</StyledPill>
      }
    >
      <StyledMetrics aria-label="Delivery work summary">
        <StyledMetric>
          <StyledMetricValue>{board.todo.length}</StyledMetricValue>
          <StyledMetricLabel>to do</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricValue>{board['in-progress'].length}</StyledMetricValue>
          <StyledMetricLabel>in progress</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric data-tone={board.blocked.length > 0 ? 'risk' : undefined}>
          <StyledMetricValue>{board.blocked.length}</StyledMetricValue>
          <StyledMetricLabel>blocked</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric
          data-tone={pendingHandoffs.length > 0 ? 'watch' : undefined}
        >
          <StyledMetricValue>{pendingHandoffs.length}</StyledMetricValue>
          <StyledMetricLabel>handoffs waiting</StyledMetricLabel>
        </StyledMetric>
      </StyledMetrics>

      <StyledSection>
        <StyledSectionHead>
          <StyledSectionTitle>Handoffs requiring a decision</StyledSectionTitle>
          <StyledSectionHint>
            Accept ownership or return it with the missing context
          </StyledSectionHint>
        </StyledSectionHead>
        <StyledPanel>
          <StyledPanelHead>
            <StyledPanelTitle>
              Incoming from sales and delivery
            </StyledPanelTitle>
            <StyledPill
              data-tone={pendingHandoffs.length > 0 ? 'watch' : undefined}
            >
              {pendingHandoffs.length}
            </StyledPill>
          </StyledPanelHead>
          <StyledStack>
            {pendingHandoffs.length > 0 ? (
              pendingHandoffs.map((handoff) => (
                <OperationsHandoffCard
                  key={handoff.id}
                  handoff={handoff}
                  now={now}
                  callbacks={callbacks}
                />
              ))
            ) : (
              <StyledEmpty>
                No handoffs are waiting for your decision.
              </StyledEmpty>
            )}
          </StyledStack>
        </StyledPanel>
      </StyledSection>

      <StyledSection>
        <StyledSectionHead>
          <StyledSectionTitle>Delivery board</StyledSectionTitle>
          <StyledSectionHint>
            Urgent work and the nearest due date rise to the top
          </StyledSectionHint>
        </StyledSectionHead>
        <StyledBoard aria-label="Operations delivery board">
          {BOARD_COLUMNS.map((column) => (
            <StyledBoardColumn key={column.status}>
              <StyledBoardHead>
                <StyledPanelTitle>{column.label}</StyledPanelTitle>
                <StyledPill
                  data-tone={
                    column.status === 'blocked' && board.blocked.length > 0
                      ? 'risk'
                      : undefined
                  }
                >
                  {board[column.status].length}
                </StyledPill>
              </StyledBoardHead>
              <StyledBoardCards>
                {board[column.status].length > 0 ? (
                  board[column.status].map((task) => (
                    <OperationsTaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      callbacks={callbacks}
                    />
                  ))
                ) : (
                  <StyledEmpty>{column.empty}</StyledEmpty>
                )}
              </StyledBoardCards>
            </StyledBoardColumn>
          ))}
        </StyledBoard>
      </StyledSection>
    </OperationsSectionShell>
  );
};
