export const TEAM_WORKSPACE_LANE_LABELS = {
  sales: 'Sales',
  operations: 'Operations',
} as const;

export type TeamWorkspaceLane = keyof typeof TEAM_WORKSPACE_LANE_LABELS;

export type TeamWorkspaceRoleSummary = {
  id: string;
  label: string;
};

export const isTeamWorkspaceLane = (
  value: unknown,
): value is TeamWorkspaceLane => value === 'sales' || value === 'operations';

// The sign-in on a team alias host (app.dewx.com) offers three doors. Sales and Operations are
// the team lanes; "My workspace" is the door for every other seat — a client (Client · Fr8labs) or
// an employee (Employee · Aziz) — whose role maps to no lane and who was, until 2026-08-28, signed
// out again after the password because the check only knew the two lanes.
export const WORKSPACE_DOOR = 'workspace' as const;

export type SignInDoor = TeamWorkspaceLane | typeof WORKSPACE_DOOR;

export const SIGN_IN_DOOR_LABELS = {
  ...TEAM_WORKSPACE_LANE_LABELS,
  [WORKSPACE_DOOR]: 'My workspace',
} as const;

export const isSignInDoor = (value: unknown): value is SignInDoor =>
  isTeamWorkspaceLane(value) || value === WORKSPACE_DOOR;

export const isTeamWorkspaceDomainAlias = (value: unknown): value is true =>
  value === true;
