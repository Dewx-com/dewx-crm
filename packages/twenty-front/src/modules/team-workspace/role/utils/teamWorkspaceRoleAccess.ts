import {
  TEAM_WORKSPACE_LANE_LABELS,
  type TeamWorkspaceLane,
  type TeamWorkspaceRoleSummary,
} from '@/team-workspace/role/types/TeamWorkspaceLane';

const TEAM_WORKSPACE_LANES_BY_ROLE_LABEL = {
  Sales: ['sales'],
  Operations: ['operations'],
  // Both lanes, no management hub. See TEAM_WORKSPACE_ROLE_LABEL.team on the server.
  Team: ['sales', 'operations'],
  Admin: ['sales', 'operations'],
} as const satisfies Record<string, readonly TeamWorkspaceLane[]>;

type TeamWorkspaceRoleLabel = keyof typeof TEAM_WORKSPACE_LANES_BY_ROLE_LABEL;

const TEAM_WORKSPACE_LANES: TeamWorkspaceLane[] = ['sales', 'operations'];

const isTeamWorkspaceRoleLabel = (
  label: string,
): label is TeamWorkspaceRoleLabel =>
  Object.hasOwn(TEAM_WORKSPACE_LANES_BY_ROLE_LABEL, label);

export const teamWorkspaceLanesFromRoles = (
  roles: readonly TeamWorkspaceRoleSummary[] | null | undefined,
): TeamWorkspaceLane[] => {
  if (roles?.length !== 1 || !isTeamWorkspaceRoleLabel(roles[0].label)) {
    return [];
  }

  const lanes = new Set<TeamWorkspaceLane>();

  for (const lane of TEAM_WORKSPACE_LANES_BY_ROLE_LABEL[roles[0].label]) {
    lanes.add(lane);
  }

  return TEAM_WORKSPACE_LANES.filter((lane) => lanes.has(lane));
};

export const canRolesEnterTeamWorkspaceLane = ({
  roles,
  lane,
}: {
  roles: readonly TeamWorkspaceRoleSummary[] | null | undefined;
  lane: TeamWorkspaceLane;
}) => teamWorkspaceLanesFromRoles(roles).includes(lane);

export const canRolesEnterTeamManagement = (
  roles: readonly TeamWorkspaceRoleSummary[] | null | undefined,
): boolean => roles?.length === 1 && roles[0].label === 'Admin';

export const teamWorkspaceLaneMismatchMessage = ({
  roles,
  selectedLane,
}: {
  roles: readonly TeamWorkspaceRoleSummary[] | null | undefined;
  selectedLane: TeamWorkspaceLane;
}) => {
  const allowedLanes = teamWorkspaceLanesFromRoles(roles);

  if (allowedLanes.length === 1) {
    const allowedLane = allowedLanes[0];

    return `This account belongs to ${TEAM_WORKSPACE_LANE_LABELS[allowedLane]}. Choose ${TEAM_WORKSPACE_LANE_LABELS[allowedLane]} to continue.`;
  }

  return `This account is not assigned to ${TEAM_WORKSPACE_LANE_LABELS[selectedLane]}. Ask an administrator to check the account role.`;
};

export class TeamWorkspaceLaneAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeamWorkspaceLaneAccessError';
  }
}
