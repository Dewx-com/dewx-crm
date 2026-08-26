import { styled } from '@linaria/react';
import { useState } from 'react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useTeamManagementActions } from '@/team-workspace/management/hooks/useTeamManagementActions';
import { type TeamManagementEmployee } from '@/team-workspace/management/utils/buildTeamManagementModel';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';

export const TEAM_MANAGEMENT_ASSIGN_MODAL_ID = 'team-management-assign-modal';

export type TeamManagementClientOption = {
  value: string;
  label: string;
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

export const TeamManagementAssignModal = ({
  employee,
  clients,
  onSaved,
  onClose,
}: {
  employee: TeamManagementEmployee;
  clients: TeamManagementClientOption[];
  onSaved: (message: string) => Promise<void>;
  onClose: () => void;
}) => {
  const { closeModal } = useModal();
  const actions = useTeamManagementActions();
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [client, setClient] = useState('');
  const [idempotencyKey] = useState(
    () => `team-owner:assignment:${crypto.randomUUID()}`,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    closeModal(TEAM_MANAGEMENT_ASSIGN_MODAL_ID);
    onClose();
  };

  const save = async () => {
    setBusy(true);
    setError(null);

    try {
      await actions.createAssignedWork({
        employee,
        title,
        detail,
        dueAt,
        client,
        idempotencyKey,
      });
      await onSaved(`Work assigned to ${employee.name}.`);
      close();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The work could not be assigned.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalStatefulWrapper
      modalInstanceId={TEAM_MANAGEMENT_ASSIGN_MODAL_ID}
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
      <StyledTitle>Assign work to {employee.name}</StyledTitle>
      <StyledDescription>
        It will show up in {employee.lane === 'sales' ? 'Sales' : 'Operations'}{' '}
        as a to-do item with the deadline you set.
      </StyledDescription>

      <StyledFields>
        <TextInput
          label="What needs to be done?"
          value={title}
          onChange={setTitle}
          maxLength={180}
          fullWidth
          autoFocus
          disabled={busy}
        />
        <TextArea
          textAreaId={`${TEAM_MANAGEMENT_ASSIGN_MODAL_ID}-detail`}
          label="Details and expected result"
          value={detail}
          onChange={setDetail}
          minRows={4}
          maxRows={10}
          disabled={busy}
        />
        <TextInput
          label="Due date and time"
          type="datetime-local"
          value={dueAt}
          onChange={setDueAt}
          fullWidth
          disabled={busy}
        />
        <StyledField>
          Client (optional)
          <StyledSelect
            value={client}
            onChange={(event) => setClient(event.target.value)}
            disabled={busy}
          >
            <option value="">Internal work</option>
            {clients.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </StyledSelect>
        </StyledField>
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
          title="Assign work"
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
