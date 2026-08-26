import {
  type OperationsHandoff,
  type OperationsWorkspaceCallbacks,
} from '@/team-workspace/operations/operations-workspace-types';
import { dueLabel } from '@/team-workspace/operations/utils/operationsWorkspaceModel';
import {
  StyledActions,
  StyledButton,
  StyledPill,
  StyledRecord,
  StyledRecordBody,
  StyledRecordHead,
  StyledRecordMeta,
  StyledRecordTitle,
  StyledTextButton,
} from './operations-workspace-elements';

type OperationsHandoffCardProps = {
  handoff: OperationsHandoff;
  now: Date;
  callbacks: OperationsWorkspaceCallbacks;
};

export const OperationsHandoffCard = ({
  handoff,
  now,
  callbacks: { onAcceptHandoff, onReturnHandoff, onOpenRecord },
}: OperationsHandoffCardProps) => (
  <StyledRecord data-tone="watch">
    <StyledRecordHead>
      <StyledRecordTitle>
        <StyledTextButton
          type="button"
          disabled={!onOpenRecord}
          onClick={() => onOpenRecord?.({ kind: 'handoff', id: handoff.id })}
        >
          {handoff.title}
        </StyledTextButton>
      </StyledRecordTitle>
      <StyledPill data-tone="watch">{dueLabel(handoff.dueAt, now)}</StyledPill>
    </StyledRecordHead>

    <StyledRecordMeta>
      <span>{handoff.clientName ?? 'Internal handoff'}</span>
      <span>From {handoff.fromName}</span>
      <span>For {handoff.toName}</span>
    </StyledRecordMeta>

    <StyledRecordBody>
      {handoff.context?.trim() ||
        'No context was included. Review the source record before accepting.'}
    </StyledRecordBody>

    <StyledActions>
      <StyledButton
        type="button"
        data-variant="primary"
        disabled={!onAcceptHandoff}
        onClick={() => onAcceptHandoff?.(handoff.id)}
      >
        Accept handoff
      </StyledButton>
      <StyledButton
        type="button"
        data-variant="danger"
        disabled={!onReturnHandoff}
        onClick={() => onReturnHandoff?.(handoff.id)}
      >
        Return for context
      </StyledButton>
      <StyledButton
        type="button"
        disabled={!onOpenRecord}
        onClick={() => onOpenRecord?.({ kind: 'handoff', id: handoff.id })}
      >
        Open
      </StyledButton>
    </StyledActions>
  </StyledRecord>
);
