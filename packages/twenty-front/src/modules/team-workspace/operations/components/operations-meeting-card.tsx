import {
  type OperationsMeeting,
  type OperationsWorkspaceCallbacks,
} from '@/team-workspace/operations/operations-workspace-types';
import { formatDateTime } from '@/team-workspace/operations/utils/operationsWorkspaceModel';
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

type OperationsMeetingCardProps = {
  meeting: OperationsMeeting;
  compact?: boolean;
  callbacks: OperationsWorkspaceCallbacks;
};

const PREP_LABEL: Record<OperationsMeeting['prepStatus'], string> = {
  'not-started': 'Prep not started',
  'in-progress': 'Prep in progress',
  ready: 'Prep ready',
};

const prepTone = (
  status: OperationsMeeting['prepStatus'],
): string | undefined => {
  if (status === 'not-started') return 'risk';
  if (status === 'in-progress') return 'watch';
  return 'healthy';
};

const meetingStatusLabel = (meeting: OperationsMeeting): string => {
  if (meeting.status === 'completed') return 'Outcome recorded';
  if (meeting.status === 'outcome-missing') return 'Outcome missing';
  if (meeting.status === 'no-show') return 'No-show';
  if (meeting.status === 'rescheduled') return 'Rescheduled';
  if (meeting.status === 'cancelled') return 'Cancelled';
  return PREP_LABEL[meeting.prepStatus];
};

const meetingTone = (meeting: OperationsMeeting): string | undefined => {
  if (meeting.status === 'completed') return 'healthy';
  if (meeting.status === 'outcome-missing' || meeting.status === 'no-show') {
    return 'risk';
  }
  if (meeting.status === 'rescheduled' || meeting.status === 'cancelled') {
    return 'watch';
  }
  return prepTone(meeting.prepStatus);
};

export const OperationsMeetingCard = ({
  meeting,
  compact = false,
  callbacks: { onPrepareMeeting, onCompleteMeeting, onOpenRecord },
}: OperationsMeetingCardProps) => (
  <StyledRecord
    data-tone={meeting.prepStatus === 'not-started' ? 'watch' : undefined}
  >
    <StyledRecordHead>
      <StyledRecordTitle>
        <StyledTextButton
          type="button"
          disabled={!onOpenRecord}
          onClick={() => onOpenRecord?.({ kind: 'meeting', id: meeting.id })}
        >
          {meeting.title}
        </StyledTextButton>
      </StyledRecordTitle>
      <StyledPill data-tone={meetingTone(meeting)}>
        {meetingStatusLabel(meeting)}
      </StyledPill>
    </StyledRecordHead>

    <StyledRecordMeta>
      <span>{meeting.clientName}</span>
      <span>{formatDateTime(meeting.startsAt)}</span>
      <span>{meeting.ownerName ?? 'No owner'}</span>
    </StyledRecordMeta>

    {meeting.purpose && <StyledRecordBody>{meeting.purpose}</StyledRecordBody>}

    {!compact && meeting.participants.length > 0 && (
      <StyledRecordBody>
        <strong>Participants:</strong> {meeting.participants.join(', ')}
      </StyledRecordBody>
    )}

    {!compact && meeting.previousMeetingSummary && (
      <StyledRecordBody>
        <strong>Context:</strong> {meeting.previousMeetingSummary}
      </StyledRecordBody>
    )}

    {!compact && meeting.prepSummary && (
      <StyledRecordBody>
        <strong>Prep:</strong> {meeting.prepSummary}
      </StyledRecordBody>
    )}

    <StyledActions>
      {meeting.status === 'scheduled' && (
        <StyledButton
          type="button"
          data-variant={meeting.prepStatus === 'ready' ? undefined : 'primary'}
          disabled={!onPrepareMeeting}
          onClick={() => onPrepareMeeting?.(meeting.id)}
        >
          {meeting.prepStatus === 'ready' ? 'Review prep' : 'Prepare meeting'}
        </StyledButton>
      )}
      {meeting.status === 'outcome-missing' && (
        <StyledButton
          type="button"
          data-variant="primary"
          disabled={!onCompleteMeeting}
          onClick={() => onCompleteMeeting?.(meeting.id)}
        >
          Record outcome
        </StyledButton>
      )}
      <StyledButton
        type="button"
        disabled={!onOpenRecord}
        onClick={() => onOpenRecord?.({ kind: 'meeting', id: meeting.id })}
      >
        Open meeting
      </StyledButton>
    </StyledActions>
  </StyledRecord>
);
