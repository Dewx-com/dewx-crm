import { styled } from '@linaria/react';
import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import {
  buildTeamManagementModel,
  TeamManagementWorkspace,
} from '@/team-workspace/management';
import {
  canRolesEnterTeamManagement,
  teamWorkspaceLanesFromRoles,
} from '@/team-workspace/role/utils/teamWorkspaceRoleAccess';
import { useTeamManagementRecords } from '@/team-workspace/shared/hooks/useTeamManagementRecords';
import { teamWorkspacePath } from '@/team-workspace/shared/utils/teamWorkspaceRoutes';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledState = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: auto;
  max-width: 560px;
  padding: ${themeCssVariables.spacing[8]};
`;

const StyledErrorTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  margin: 0 0 ${themeCssVariables.spacing[2]};
`;

export const TeamManagementPage = () => {
  const { workspaceMemberId } = useParams<{ workspaceMemberId?: string }>();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const isTeamWorkspaceDomain =
    workspacePublicData?.isTeamWorkspaceDomainAlias === true;
  const isManager = canRolesEnterTeamManagement(currentWorkspaceMember?.roles);
  const records = useTeamManagementRecords(
    !isTeamWorkspaceDomain || !isManager,
  );
  const now = useMemo(() => new Date(), []);
  const model = useMemo(
    () =>
      records.snapshot
        ? buildTeamManagementModel({
            generatedAt: records.snapshot.generatedAt,
            members: records.snapshot.members,
            salesRecords: records.salesRecords,
            operationsRecords: records.operationsRecords,
            now,
          })
        : null,
    [now, records.operationsRecords, records.salesRecords, records.snapshot],
  );

  if (!currentWorkspaceMember || !workspacePublicData) {
    return (
      <StyledPage>
        <StyledState>Loading the owner workspace…</StyledState>
      </StyledPage>
    );
  }

  if (!isTeamWorkspaceDomain) {
    return <Navigate replace to="/" />;
  }

  if (!isManager) {
    const lane = teamWorkspaceLanesFromRoles(currentWorkspaceMember.roles)[0];

    return (
      <Navigate
        replace
        to={lane ? teamWorkspacePath({ lane, section: 'today' }) : '/'}
      />
    );
  }

  if (records.error) {
    return (
      <StyledPage>
        <StyledState role="alert">
          <StyledErrorTitle>Team management unavailable</StyledErrorTitle>
          The private management projection could not be loaded. Reload before
          making a decision from the displayed records.
        </StyledState>
      </StyledPage>
    );
  }

  if (records.loading && !model) {
    return (
      <StyledPage>
        <StyledState>Loading the team management records…</StyledState>
      </StyledPage>
    );
  }

  if (!model) {
    return (
      <StyledPage>
        <StyledState>No team management snapshot is available.</StyledState>
      </StyledPage>
    );
  }

  if (
    workspaceMemberId &&
    !model.employees.some((employee) => employee.id === workspaceMemberId)
  ) {
    return <Navigate replace to="/team/management/overview" />;
  }

  return (
    <StyledPage>
      <TeamManagementWorkspace
        model={model}
        selectedMemberId={workspaceMemberId}
      />
    </StyledPage>
  );
};
