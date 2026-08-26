import { gql } from '@apollo/client';

import { type TeamWorkspaceRoleSummary } from '@/team-workspace/role/types/TeamWorkspaceLane';

export type CurrentTeamWorkspaceMemberRolesQuery = {
  currentUser?: {
    workspaceMember?: {
      roles?: TeamWorkspaceRoleSummary[] | null;
    } | null;
  } | null;
};

// Kept small on purpose: this request is the authorization check that runs before
// the authenticated workspace state is accepted by the frontend.
export const GET_CURRENT_TEAM_WORKSPACE_MEMBER_ROLES = gql`
  query GetCurrentTeamWorkspaceMemberRoles {
    currentUser {
      workspaceMember {
        roles {
          id
          label
        }
      }
    }
  }
`;
