import { type OperationsWorkspaceCallbacks } from '@/team-workspace/operations/operations-workspace-types';
import { type ClientNeedingUpdate } from '@/team-workspace/operations/utils/operationsWorkspaceModel';
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

type OperationsClientUpdateCardProps = {
  item: ClientNeedingUpdate;
  callbacks: OperationsWorkspaceCallbacks;
};

const updateAgeLabel = (item: ClientNeedingUpdate): string => {
  if (item.ageDays === null) return 'No verified update';
  if (item.ageDays === 1) return 'Verified 1 day ago';
  return `Verified ${item.ageDays} days ago`;
};

const CLIENT_STATUS_LABEL = {
  onboarding: 'Onboarding',
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
  unknown: 'Not classified',
} as const;

export const OperationsClientUpdateCard = ({
  item,
  callbacks: { onAddUpdate, onOpenRecord },
}: OperationsClientUpdateCardProps) => (
  <StyledRecord data-tone={item.ageDays === null ? 'risk' : 'watch'}>
    <StyledRecordHead>
      <StyledRecordTitle>
        <StyledTextButton
          type="button"
          disabled={!onOpenRecord}
          onClick={() => onOpenRecord?.({ kind: 'client', id: item.client.id })}
        >
          {item.client.name}
        </StyledTextButton>
      </StyledRecordTitle>
      <StyledPill data-tone={item.ageDays === null ? 'risk' : 'watch'}>
        {updateAgeLabel(item)}
      </StyledPill>
    </StyledRecordHead>

    <StyledRecordMeta>
      <span>{item.client.ownerName ?? 'No owner'}</span>
      <span>{CLIENT_STATUS_LABEL[item.client.status]}</span>
    </StyledRecordMeta>

    <StyledRecordBody>
      {item.lastVerifiedUpdate?.summary ??
        'There is no verified client update to plan from yet.'}
    </StyledRecordBody>

    <StyledActions>
      <StyledButton
        type="button"
        data-variant="primary"
        disabled={!onAddUpdate}
        onClick={() => onAddUpdate?.(item.client.id)}
      >
        Add verified update
      </StyledButton>
      <StyledButton
        type="button"
        disabled={!onOpenRecord}
        onClick={() => onOpenRecord?.({ kind: 'client', id: item.client.id })}
      >
        Open client
      </StyledButton>
    </StyledActions>
  </StyledRecord>
);
