import { useAuth } from '@/auth/hooks/useAuth';
import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { countAvailableWorkspaces } from '@/auth/utils/availableWorkspacesUtils';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { H2Title } from 'twenty-ui/typography';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useMutation } from '@apollo/client/react';
import {
  DeleteUserAccountDocument,
  DeleteUserWorkspaceDocument,
} from '~/generated-metadata/graphql';

const DELETE_ACCOUNT_MODAL_ID = 'delete-account-modal';
const LEAVE_WORKSPACE_MODAL_ID = 'leave-workspace-modal';

const StyledDangerActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

export const DeleteAccount = () => {
  const { t } = useLingui();
  const { openModal } = useModal();
  const { enqueueErrorSnackBar } = useSnackBar();

  const [deleteUserAccount] = useMutation(DeleteUserAccountDocument);
  const [deleteUserFromWorkspace] = useMutation(DeleteUserWorkspaceDocument);
  const currentUser = useAtomStateValue(currentUserState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const isOwner = Boolean(
    currentUser?.id && currentUser.id === currentWorkspace?.primaryOwnerUserId,
  );
  const userEmail = currentUser?.email;
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const currentWorkspaceMemberId = currentWorkspaceMember?.id;
  const { signOut } = useAuth();
  const availableWorkspaces = useAtomStateValue(availableWorkspacesState);
  const availableWorkspacesCount =
    countAvailableWorkspaces(availableWorkspaces);

  const userHasMultipleWorkspaces = availableWorkspacesCount > 1;

  const deleteAccount = async () => {
    try {
      await deleteUserAccount();
      await signOut();
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? error.message
            : t`Unable to delete your account`,
      });
    }
  };

  const leaveWorkspace = async () => {
    if (!isDefined(currentWorkspaceMemberId)) {
      enqueueErrorSnackBar({
        message: t`Current workspace member not found.`,
      });
      return;
    }

    try {
      await deleteUserFromWorkspace({
        variables: { workspaceMemberIdToDelete: currentWorkspaceMemberId },
      });
      await signOut();
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error ? error.message : t`Unable to leave this CRM`,
      });
    }
  };

  return (
    <>
      <H2Title
        title={t`Danger zone`}
        description={
          isOwner
            ? t`Transfer ownership to another administrator before leaving this CRM or deleting your account.`
            : userHasMultipleWorkspaces
              ? t`Delete account and all the associated data or leave workspace`
              : t`Delete account and all the associated data`
        }
      />
      <StyledDangerActions>
        {userHasMultipleWorkspaces && (
          <Button
            accent="danger"
            onClick={() => openModal(LEAVE_WORKSPACE_MODAL_ID)}
            variant="secondary"
            title={t`Leave workspace`}
            disabled={isOwner}
          />
        )}
        <Button
          accent="danger"
          onClick={() => openModal(DELETE_ACCOUNT_MODAL_ID)}
          variant="secondary"
          title={t`Delete account`}
          disabled={isOwner}
        />
      </StyledDangerActions>
      {userHasMultipleWorkspaces && (
        <ConfirmationModal
          confirmationValue={userEmail}
          confirmationPlaceholder={userEmail ?? ''}
          modalInstanceId={LEAVE_WORKSPACE_MODAL_ID}
          title={t`Leave workspace`}
          subtitle={
            <>
              {t`This action cannot be undone. Your membership will be removed; synced emails and calendars stay with the workspace.`}
              <br />
              {t`Please type in your email to confirm.`}
            </>
          }
          onConfirmClick={leaveWorkspace}
          confirmButtonText={t`Leave workspace`}
        />
      )}
      <ConfirmationModal
        confirmationValue={userEmail}
        confirmationPlaceholder={userEmail ?? ''}
        modalInstanceId={DELETE_ACCOUNT_MODAL_ID}
        title={t`Account Deletion`}
        subtitle={
          <>
            {t`This action cannot be undone. This will permanently delete your
            entire account.`}
            <br />
            {t`Please type in your email to confirm.`}
          </>
        }
        onConfirmClick={deleteAccount}
        confirmButtonText={t`Delete account`}
      />
    </>
  );
};
