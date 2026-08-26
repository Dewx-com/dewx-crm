import { styled } from '@linaria/react';
import { useMemo, useState } from 'react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { type TeamWorkspaceLane } from '@/team-workspace/role/types/TeamWorkspaceLane';
import {
  type MeetingOutcomeKind,
  useTeamWorkspaceActions,
} from '@/team-workspace/shared/hooks/useTeamWorkspaceActions';
import {
  type TeamOpportunityRecord,
  type TeamTaskRecord,
  type TeamWorkspaceRecords,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';
import {
  compactText,
  fullName,
} from '@/team-workspace/shared/utils/teamWorkspaceRecordModel';

export const TEAM_WORKSPACE_ACTION_MODAL_ID = 'team-workspace-action-modal';

export type TeamWorkspaceActionRequest =
  | { kind: 'meeting-prep'; meetingId: string }
  | { kind: 'meeting-outcome'; meetingId: string }
  | { kind: 'opportunity-update'; opportunityId: string }
  | { kind: 'coaching-lesson'; recordingId: string }
  | { kind: 'client-update'; clientId: string }
  | { kind: 'task-finish'; taskId: string }
  | { kind: 'task-block'; taskId: string }
  | { kind: 'handoff-return'; handoffId: string };

type TeamWorkspaceActionModalProps = {
  action: TeamWorkspaceActionRequest;
  lane: TeamWorkspaceLane;
  records: TeamWorkspaceRecords;
  onSaved: (message: string) => Promise<void>;
  onClose: () => void;
};

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[5]};
`;

const StyledFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.light};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.md};
  min-height: 36px;
  padding: 0 ${themeCssVariables.spacing[2]};

  &:focus-visible {
    border-color: ${themeCssVariables.color.blue};
    box-shadow: 0 0 0 3px ${themeCssVariables.color.transparent.blue2};
    outline: none;
  }
`;

const StyledNotice = styled.div`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.45;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  margin-top: ${themeCssVariables.spacing[6]};
`;

const STAGES = [
  { value: 'NEW', label: 'New' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'DECISION', label: 'Decision' },
  { value: 'CUSTOMER', label: 'Won — hand over to Operations' },
  { value: 'LOST', label: 'Lost' },
  { value: 'NURTURE', label: 'Nurture' },
  { value: 'DNC', label: 'Do not contact' },
] as const;

const MEETING_OUTCOMES: Array<{
  value: MeetingOutcomeKind;
  label: string;
}> = [
  { value: 'ATTENDED', label: 'Attended' },
  { value: 'NO_SHOW', label: 'No-show' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const modalCopy = (action: TeamWorkspaceActionRequest) => {
  switch (action.kind) {
    case 'meeting-prep':
      return {
        title: 'Prepare for this meeting',
        description:
          'Write the facts, questions, and intended next commitment. This is saved on the meeting record trail.',
        submit: 'Save preparation',
      };
    case 'meeting-outcome':
      return {
        title: 'Record the meeting outcome',
        description:
          'Record what actually happened and the agreed next step. Do not treat a calendar event as proof of attendance.',
        submit: 'Save outcome',
      };
    case 'opportunity-update':
      return {
        title: 'Update the opportunity',
        description:
          'Move the real stage. A won deal requires a complete handoff before Operations receives it.',
        submit: 'Save update',
      };
    case 'coaching-lesson':
      return {
        title: 'Record what to improve',
        description:
          'Write one concrete behavior to carry into the next call. The call evidence stays visible beside it.',
        submit: 'Save lesson',
      };
    case 'client-update':
      return {
        title: 'Add a verified client update',
        description:
          'Say what changed and point to the evidence. Unverified progress should not be reported as complete.',
        submit: 'Publish update',
      };
    case 'task-finish':
      return {
        title: 'Finish this work with evidence',
        description:
          'A task only becomes done when Fahim records what was delivered and where it can be checked.',
        submit: 'Save evidence and finish',
      };
    case 'task-block':
      return {
        title: 'Record the blocker',
        description:
          'Name the exact thing stopping the work so the owner can remove it.',
        submit: 'Mark blocked',
      };
    case 'handoff-return':
      return {
        title: 'Return this handoff',
        description:
          'Explain exactly what Sales must add. The original handoff stays pending until it is complete.',
        submit: 'Return to Sales',
      };
  }
};

const opportunityOf = (
  records: TeamWorkspaceRecords,
  opportunityId: string,
): TeamOpportunityRecord | null =>
  records.opportunities.find(
    (opportunity) => opportunity.id === opportunityId,
  ) ?? null;

const taskOf = (
  records: TeamWorkspaceRecords,
  taskId: string,
): TeamTaskRecord | null =>
  records.tasks.find((task) => task.id === taskId) ?? null;

export const TeamWorkspaceActionModal = ({
  action,
  lane,
  records,
  onSaved,
  onClose,
}: TeamWorkspaceActionModalProps) => {
  const mutations = useTeamWorkspaceActions(lane);
  const { closeModal } = useModal();
  const copy = modalCopy(action);
  const opportunity =
    action.kind === 'opportunity-update'
      ? opportunityOf(records, action.opportunityId)
      : null;
  const task =
    action.kind === 'task-finish' || action.kind === 'task-block'
      ? taskOf(records, action.taskId)
      : null;
  const meeting =
    action.kind === 'meeting-prep' || action.kind === 'meeting-outcome'
      ? (records.meetings.find((item) => item.id === action.meetingId) ?? null)
      : null;
  const handoff =
    action.kind === 'handoff-return'
      ? (records.handoffs.find((item) => item.id === action.handoffId) ?? null)
      : null;

  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [stage, setStage] = useState(opportunity?.stage ?? 'NEW');
  const [outcomeKind, setOutcomeKind] =
    useState<MeetingOutcomeKind>('ATTENDED');
  const [contact, setContact] = useState(
    fullName(opportunity?.pointOfContact?.name),
  );
  const [problem, setProblem] = useState('');
  const [agreedScope, setAgreedScope] = useState('');
  const [promises, setPromises] = useState('');
  const [nextCommitment, setNextCommitment] = useState('');
  const [clientScope, setClientScope] = useState(opportunity?.client ?? '');
  const [idempotencyKey] = useState(() => `team-ui:${crypto.randomUUID()}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingHandoff = useMemo(
    () =>
      opportunity
        ? records.handoffs.find((candidate) =>
            compactText(candidate.title).includes(opportunity.id),
          )
        : null,
    [opportunity, records.handoffs],
  );

  const close = () => {
    closeModal(TEAM_WORKSPACE_ACTION_MODAL_ID);
    onClose();
  };

  const save = async () => {
    setBusy(true);
    setError(null);

    try {
      switch (action.kind) {
        case 'meeting-prep': {
          if (!meeting) throw new Error('This meeting is no longer available.');
          await mutations.prepareMeeting({
            meeting,
            notes,
            idempotencyKey,
          });
          await onSaved('Meeting preparation saved.');
          break;
        }
        case 'meeting-outcome': {
          if (!meeting) throw new Error('This meeting is no longer available.');
          await mutations.recordMeetingOutcome({
            meeting,
            outcomeKind,
            outcome: notes,
            idempotencyKey,
          });
          await onSaved('Meeting outcome recorded.');
          break;
        }
        case 'opportunity-update': {
          if (!opportunity) {
            throw new Error('This opportunity is no longer available.');
          }
          if (stage === 'CUSTOMER') {
            if (existingHandoff) {
              if (opportunity.stage?.toUpperCase() !== 'CUSTOMER') {
                throw new Error(
                  'A handoff already exists without a matching won stage. Ask an administrator to reconcile this record.',
                );
              }
            } else {
              await mutations.winOpportunityWithHandoff({
                opportunity,
                company:
                  compactText(opportunity.company?.name) ||
                  compactText(opportunity.name),
                client: clientScope,
                contact,
                problem,
                agreedScope,
                promises,
                nextCommitment,
                evidence,
                source: sourceRef,
              });
            }
          } else {
            await mutations.updateOpportunityStage({
              opportunity,
              stage,
            });
          }
          await onSaved(
            stage === 'CUSTOMER'
              ? existingHandoff
                ? 'Opportunity marked won; the existing handoff remains with Operations.'
                : 'Opportunity marked won and handed to Operations.'
              : 'Opportunity stage updated.',
          );
          break;
        }
        case 'coaching-lesson': {
          const recording = records.callRecordings.find(
            (item) => item.id === action.recordingId,
          );
          await mutations.recordCoachingLesson({
            recordingId: action.recordingId,
            evidenceReference: recording?.evidenceReference ?? null,
            lesson: notes,
            idempotencyKey,
          });
          await onSaved('Coaching lesson saved for the next call.');
          break;
        }
        case 'client-update': {
          const client = records.clients.find(
            (candidate) => candidate.id === action.clientId,
          );
          if (!client) throw new Error('This client is no longer available.');
          await mutations.appendClientUpdate({
            clientId: client.id,
            update: notes,
            evidence,
            source: sourceRef,
            idempotencyKey,
          });
          await onSaved('Verified client update published.');
          break;
        }
        case 'task-finish': {
          if (!task) throw new Error('This task is no longer available.');
          const combinedEvidence = sourceRef.trim()
            ? `${evidence.trim()}\n\nSource: ${sourceRef.trim()}`
            : evidence;
          await mutations.updateTaskStatus({
            task,
            status: 'DONE',
            completionEvidence: combinedEvidence,
          });
          await onSaved('Task finished with completion evidence.');
          break;
        }
        case 'task-block': {
          if (!task) throw new Error('This task is no longer available.');
          await mutations.createBlocker({
            task,
            reason: notes,
            idempotencyKey,
          });
          await onSaved('Blocker recorded and visible to the team.');
          break;
        }
        case 'handoff-return': {
          if (!handoff) throw new Error('This handoff is no longer available.');
          await mutations.returnHandoff({
            handoff,
            reason: notes,
            idempotencyKey,
          });
          await onSaved('Handoff returned to Sales with the missing context.');
          break;
        }
      }

      close();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The update could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };

  const isWonHandoff =
    action.kind === 'opportunity-update' && stage === 'CUSTOMER';

  return (
    <ModalStatefulWrapper
      modalInstanceId={TEAM_WORKSPACE_ACTION_MODAL_ID}
      isClosable
      onClose={onClose}
      size="medium"
      padding="large"
      overlay="dark"
      renderInDocumentBody
      smallBorderRadius
      autoHeight
      dataGloballyPreventClickOutside
    >
      <StyledTitle>{copy.title}</StyledTitle>
      <StyledDescription>{copy.description}</StyledDescription>

      <StyledFields>
        {action.kind === 'meeting-outcome' && (
          <StyledField>
            Result
            <StyledSelect
              value={outcomeKind}
              onChange={(event) =>
                setOutcomeKind(event.target.value as MeetingOutcomeKind)
              }
              disabled={busy}
            >
              {MEETING_OUTCOMES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
        )}

        {(action.kind === 'meeting-prep' ||
          action.kind === 'meeting-outcome' ||
          action.kind === 'coaching-lesson' ||
          action.kind === 'task-block' ||
          action.kind === 'handoff-return') && (
          <TextArea
            textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-notes`}
            label={
              action.kind === 'meeting-prep'
                ? 'Preparation notes'
                : action.kind === 'meeting-outcome'
                  ? 'What happened and what is next?'
                  : action.kind === 'coaching-lesson'
                    ? 'One improvement for the next call'
                    : action.kind === 'task-block'
                      ? 'What is blocking this work?'
                      : 'What context is missing?'
            }
            minRows={4}
            maxRows={10}
            value={notes}
            onChange={setNotes}
            disabled={busy}
          />
        )}

        {action.kind === 'client-update' && (
          <>
            <TextArea
              textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-update`}
              label="What changed?"
              minRows={4}
              maxRows={10}
              value={notes}
              onChange={setNotes}
              disabled={busy}
            />
            <TextArea
              textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-update-evidence`}
              label="Evidence"
              minRows={2}
              maxRows={6}
              value={evidence}
              onChange={setEvidence}
              disabled={busy}
            />
            <TextInput
              label="Where can it be checked?"
              placeholder="Record ID, safe link, file name, or client confirmation"
              value={sourceRef}
              onChange={setSourceRef}
              fullWidth
              disabled={busy}
            />
          </>
        )}

        {action.kind === 'task-finish' && (
          <>
            <TextArea
              textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-completion`}
              label="What was delivered?"
              minRows={4}
              maxRows={10}
              value={evidence}
              onChange={setEvidence}
              disabled={busy}
            />
            <TextInput
              label="Where can it be checked?"
              placeholder="Record ID, safe link, file name, or client confirmation"
              value={sourceRef}
              onChange={setSourceRef}
              fullWidth
              disabled={busy}
            />
          </>
        )}

        {action.kind === 'opportunity-update' && opportunity && (
          <>
            <StyledField>
              Stage
              <StyledSelect
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                disabled={busy}
              >
                {STAGES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>

            {isWonHandoff && existingHandoff && (
              <StyledNotice>
                A handoff already exists for this opportunity. This will move
                the stage without creating a duplicate.
              </StyledNotice>
            )}

            {isWonHandoff && !existingHandoff && (
              <>
                <TextInput
                  label="Client scope"
                  placeholder="Stable client slug, for example acme"
                  value={clientScope}
                  onChange={setClientScope}
                  fullWidth
                  disabled={busy}
                />
                <TextInput
                  label="Decision contact"
                  value={contact}
                  onChange={setContact}
                  fullWidth
                  disabled={busy}
                />
                <TextArea
                  textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-problem`}
                  label="Problem the client asked us to solve"
                  value={problem}
                  onChange={setProblem}
                  minRows={2}
                  disabled={busy}
                />
                <TextArea
                  textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-scope`}
                  label="Agreed scope"
                  value={agreedScope}
                  onChange={setAgreedScope}
                  minRows={2}
                  disabled={busy}
                />
                <TextArea
                  textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-promises`}
                  label="Promises made — write “None” if none"
                  value={promises}
                  onChange={setPromises}
                  minRows={2}
                  disabled={busy}
                />
                <TextArea
                  textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-commitment`}
                  label="Next client commitment and date"
                  value={nextCommitment}
                  onChange={setNextCommitment}
                  minRows={2}
                  disabled={busy}
                />
                <TextArea
                  textAreaId={`${TEAM_WORKSPACE_ACTION_MODAL_ID}-handoff-evidence`}
                  label="Evidence for the agreement"
                  value={evidence}
                  onChange={setEvidence}
                  minRows={2}
                  disabled={busy}
                />
                <TextInput
                  label="Where can the agreement be checked?"
                  placeholder="Proposal ID, safe link, email subject, or call reference"
                  value={sourceRef}
                  onChange={setSourceRef}
                  fullWidth
                  disabled={busy}
                />
              </>
            )}
          </>
        )}

        {error && <StyledError role="alert">{error}</StyledError>}
      </StyledFields>

      <StyledActions>
        <Button
          title="Cancel"
          variant="secondary"
          onClick={close}
          disabled={busy}
        />
        <Button
          title={copy.submit}
          variant="primary"
          accent="blue"
          onClick={save}
          disabled={busy}
          isLoading={busy}
        />
      </StyledActions>
    </ModalStatefulWrapper>
  );
};
