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

export const isTeamWorkspaceDomainAlias = (value: unknown): value is true =>
  value === true;
