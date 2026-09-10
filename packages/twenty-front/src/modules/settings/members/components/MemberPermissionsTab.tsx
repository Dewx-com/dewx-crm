import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { SettingsRolePermissions } from '@/settings/roles/role-permissions/components/SettingsRolePermissions';
import { type RoleWithPartialMembers } from '@/settings/roles/types/RoleWithPartialMembers';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Select } from '@/ui/input/components/Select';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { type WorkspaceMember } from '@/workspace-member/types/WorkspaceMember';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconArrowUpRight, IconUser, useIcons } from 'twenty-ui/icon';
import { H2Title } from 'twenty-ui/typography';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useMutation } from '@apollo/client/react';
import {
  TransferWorkspaceOwnershipDocument,
  UpdateWorkspaceMemberRoleDocument,
} from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

const CONFIRM_ROLE_CHANGE_MODAL_ID = 'confirm-role-change-modal';
const TRANSFER_OWNERSHIP_MODAL_ID = 'transfer-account-ownership-modal';

const StyledNoRoleContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  justify-content: center;
  padding: ${themeCssVariables.spacing[8]};
`;

const StyledRoleContainer = styled.div`
  align-items: flex-end;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[8]};
`;

const StyledRoleSelector = styled.div`
  flex: 1;
`;

type MemberPermissionsTabProps = {
  member: WorkspaceMember;
  roles: RoleWithPartialMembers[];
  allRoles: RoleWithPartialMembers[];
};

export const MemberPermissionsTab = ({
  member,
  roles,
  allRoles,
}: MemberPermissionsTabProps) => {
  const primaryRole = roles?.[0];
  const currentUser = useAtomStateValue(currentUserState);
  const [currentWorkspace, setCurrentWorkspace] = useAtomState(
    currentWorkspaceState,
  );
  const isOwner = Boolean(
    member.userId && member.userId === currentWorkspace?.primaryOwnerUserId,
  );
  const canTransferOwnership = Boolean(
    currentUser?.id &&
    currentUser.id === currentWorkspace?.primaryOwnerUserId &&
    member.userId &&
    !isOwner &&
    primaryRole?.universalIdentifier === '20202020-02c2-43f2-b94d-cab1f2b532eb',
  );
  const [transferOwnership, { loading: isTransferring }] = useMutation(
    TransferWorkspaceOwnershipDocument,
  );
  const { getIcon } = useIcons();
  const navigateSettings = useNavigateSettings();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const { openModal } = useModal();
  const [pendingRole, setPendingRole] = useState<RoleWithPartialMembers | null>(
    null,
  );

  const [updateWorkspaceMemberRoleMutation] = useMutation(
    UpdateWorkspaceMemberRoleDocument,
  );

  const rolesOptions =
    allRoles
      ?.filter((role) => role.canBeAssignedToUsers)
      .map((role) => ({
        label: role.label,
        value: role.id,
        Icon: getIcon(role.icon) ?? IconUser,
      })) ?? [];

  const handleRoleChangeRequest = (newRoleId: string) => {
    const newRole = allRoles.find((role) => role.id === newRoleId);
    if (isOwner || !newRole || newRoleId === primaryRole?.id) return;

    setPendingRole(newRole);
    openModal(CONFIRM_ROLE_CHANGE_MODAL_ID);
  };

  const handleConfirmRoleChange = async () => {
    if (isOwner || !member?.id || !pendingRole) return;

    try {
      await updateWorkspaceMemberRoleMutation({
        variables: {
          workspaceMemberId: member.id,
          roleId: pendingRole.id,
        },
        refetchQueries: ['GetRoles'],
      });
      enqueueSuccessSnackBar({ message: t`Role updated successfully` });
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error ? error.message : t`Failed to update role`,
      });
    } finally {
      setPendingRole(null);
    }
  };

  const handleTransferOwnership = async () => {
    if (!canTransferOwnership || !member.userId || isTransferring) return;
    try {
      const result = await transferOwnership({
        variables: { nextOwnerUserId: member.userId },
      });
      const account = result.data?.transferWorkspaceOwnership;
      if (!account) return;
      setCurrentWorkspace((previous) =>
        previous?.id === account.id
          ? { ...previous, primaryOwnerUserId: account.primaryOwnerUserId }
          : previous,
      );
      enqueueSuccessSnackBar({ message: t`Ownership transferred` });
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? error.message
            : t`Unable to transfer ownership`,
      });
    }
  };

  const handleOpenRole = () => {
    if (isDefined(primaryRole)) {
      navigateSettings(SettingsPath.RoleDetail, { roleId: primaryRole.id });
    }
  };

  if (!isDefined(primaryRole)) {
    return (
      <StyledNoRoleContainer>{t`No role assigned to this member`}</StyledNoRoleContainer>
    );
  }

  const oldRoleLabel = primaryRole.label;
  const newRoleLabel = pendingRole?.label || '';

  return (
    <>
      <Section>
        <H2Title
          title={t`Role`}
          description={
            isOwner
              ? t`The account owner keeps full administrator access. Transfer ownership before changing their role.`
              : t`Customize what this user can view and perform`
          }
        />
        <StyledRoleContainer>
          <StyledRoleSelector>
            <Select
              disabled={isOwner}
              dropdownId="member-role-select"
              options={rolesOptions}
              value={primaryRole.id}
              onChange={handleRoleChangeRequest}
              withSearchInput
              fullWidth
            />
          </StyledRoleSelector>
          <Button
            Icon={IconArrowUpRight}
            title={t`Open in Roles`}
            variant="secondary"
            onClick={handleOpenRole}
          />
        </StyledRoleContainer>
        <SettingsRolePermissions roleId={primaryRole.id} isEditable={false} />
      </Section>

      {canTransferOwnership && (
        <Section>
          <H2Title
            title={t`Account ownership`}
            description={t`Give this administrator ownership of your CRM. You will remain an administrator, and the new owner can remove your access.`}
          />
          <Button
            title={t`Transfer ownership`}
            variant="secondary"
            disabled={isTransferring}
            onClick={() => openModal(TRANSFER_OWNERSHIP_MODAL_ID)}
          />
          <ConfirmationModal
            modalInstanceId={TRANSFER_OWNERSHIP_MODAL_ID}
            title={t`Transfer account ownership`}
            subtitle={t`This member will control the CRM and its team. Only the new owner can transfer ownership back. Type their email to confirm.`}
            confirmationValue={member.userEmail}
            confirmationPlaceholder={member.userEmail}
            confirmButtonText={t`Transfer ownership`}
            onConfirmClick={handleTransferOwnership}
            loading={isTransferring}
          />
        </Section>
      )}

      {pendingRole && (
        <ConfirmationModal
          modalInstanceId={CONFIRM_ROLE_CHANGE_MODAL_ID}
          title={t`Confirm role update`}
          subtitle={t`Are you sure you want to update the role of this user from "${oldRoleLabel}" to "${newRoleLabel}"?`}
          onConfirmClick={handleConfirmRoleChange}
          confirmButtonText={t`Update role`}
          confirmButtonAccent="blue"
        />
      )}
    </>
  );
};
