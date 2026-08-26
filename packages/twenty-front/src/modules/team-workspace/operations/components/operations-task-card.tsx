import {
  type OperationsTask,
  type OperationsWorkspaceCallbacks,
} from '@/team-workspace/operations/operations-workspace-types';
import {
  canMarkTaskDone,
  dueLabel,
  isTaskOverdue,
} from '@/team-workspace/operations/utils/operationsWorkspaceModel';
import {
  StyledActions,
  StyledButton,
  StyledEvidence,
  StyledPill,
  StyledRecord,
  StyledRecordBody,
  StyledRecordHead,
  StyledRecordMeta,
  StyledRecordTitle,
  StyledTextButton,
} from './operations-workspace-elements';

type OperationsTaskCardProps = {
  task: OperationsTask;
  now: Date;
  compact?: boolean;
  callbacks: OperationsWorkspaceCallbacks;
};

const priorityTone = (task: OperationsTask, now: Date): string | undefined => {
  if (isTaskOverdue(task, now) || task.priority === 'urgent') return 'risk';
  if (task.priority === 'high' || task.status === 'blocked') return 'watch';
  return undefined;
};

export const OperationsTaskCard = ({
  task,
  now,
  compact = false,
  callbacks: { onTaskStatusChange, onOpenRecord },
}: OperationsTaskCardProps) => {
  const hasEvidence = canMarkTaskDone(task);
  const tone = priorityTone(task, now);

  const changeWorkingStatus = (
    status: Exclude<OperationsTask['status'], 'done'>,
  ) =>
    onTaskStatusChange?.({
      taskId: task.id,
      status,
    });

  const markDone = () => {
    if (!task.completionEvidence || !hasEvidence) return;

    onTaskStatusChange?.({
      taskId: task.id,
      status: 'done',
      evidence: task.completionEvidence,
    });
  };

  return (
    <StyledRecord data-tone={tone}>
      <StyledRecordHead>
        <StyledRecordTitle>
          <StyledTextButton
            type="button"
            disabled={!onOpenRecord}
            onClick={() => onOpenRecord?.({ kind: 'task', id: task.id })}
          >
            {task.title}
          </StyledTextButton>
        </StyledRecordTitle>
        <StyledPill data-tone={tone}>{dueLabel(task.dueAt, now)}</StyledPill>
      </StyledRecordHead>

      <StyledRecordMeta>
        <span>{task.clientName ?? 'Internal work'}</span>
        <span>{task.ownerName ?? 'No owner'}</span>
        {task.isClientPromise && <span>Client promise</span>}
      </StyledRecordMeta>

      {task.status === 'blocked' && (
        <StyledRecordBody>
          {task.blockedReason?.trim() ||
            'Blocked, but no reason has been recorded.'}
        </StyledRecordBody>
      )}

      {!compact && task.status === 'done' && (
        <StyledEvidence data-missing={!hasEvidence}>
          {hasEvidence ? (
            <>
              <strong>Completion evidence</strong>
              <span>{task.completionEvidence?.summary}</span>
              <span>
                {task.completionEvidence?.recordedBy} ·{' '}
                {task.completionEvidence?.sourceRef}
              </span>
            </>
          ) : (
            <span>
              Done is not verified. Add evidence or move this task back into
              work.
            </span>
          )}
        </StyledEvidence>
      )}

      <StyledActions>
        {task.status === 'todo' && (
          <StyledButton
            type="button"
            data-variant="primary"
            disabled={!onTaskStatusChange}
            onClick={() => changeWorkingStatus('in-progress')}
          >
            Start work
          </StyledButton>
        )}

        {task.status === 'in-progress' && (
          <StyledButton
            type="button"
            disabled={!onTaskStatusChange}
            onClick={() => changeWorkingStatus('blocked')}
          >
            Mark blocked
          </StyledButton>
        )}

        {task.status === 'blocked' && (
          <StyledButton
            type="button"
            data-variant="primary"
            disabled={!onTaskStatusChange}
            onClick={() => changeWorkingStatus('in-progress')}
          >
            Resume
          </StyledButton>
        )}

        {task.status !== 'done' &&
          (hasEvidence ? (
            <StyledButton
              type="button"
              disabled={!onTaskStatusChange}
              onClick={markDone}
            >
              Mark done
            </StyledButton>
          ) : (
            <StyledButton
              type="button"
              disabled={!onOpenRecord}
              onClick={() => onOpenRecord?.({ kind: 'task', id: task.id })}
            >
              Add evidence to finish
            </StyledButton>
          ))}

        <StyledButton
          type="button"
          disabled={!onOpenRecord}
          onClick={() => onOpenRecord?.({ kind: 'task', id: task.id })}
        >
          Open
        </StyledButton>
      </StyledActions>
    </StyledRecord>
  );
};
