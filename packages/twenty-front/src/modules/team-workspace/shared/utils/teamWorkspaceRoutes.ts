import {
  isTeamWorkspaceLane,
  type TeamWorkspaceLane,
} from '@/team-workspace/role/types/TeamWorkspaceLane';
import { SALES_WORKSPACE_SECTIONS } from '@/team-workspace/sales';
import { type OperationsWorkspaceSection } from '@/team-workspace/operations';

export const OPERATIONS_WORKSPACE_SECTIONS = [
  'today',
  'clients',
  'work',
  'meetings',
] as const satisfies readonly OperationsWorkspaceSection[];

export type TeamWorkspaceSection =
  | (typeof SALES_WORKSPACE_SECTIONS)[number]
  | (typeof OPERATIONS_WORKSPACE_SECTIONS)[number];

export const TEAM_WORKSPACE_SECTIONS_BY_LANE = {
  sales: SALES_WORKSPACE_SECTIONS,
  operations: OPERATIONS_WORKSPACE_SECTIONS,
} as const;

export const isTeamWorkspaceSectionForLane = ({
  lane,
  section,
}: {
  lane: TeamWorkspaceLane;
  section: string | null | undefined;
}): boolean =>
  Boolean(
    section &&
    (TEAM_WORKSPACE_SECTIONS_BY_LANE[lane] as readonly string[]).includes(
      section,
    ),
  );

export const teamWorkspacePath = ({
  lane,
  section = 'today',
}: {
  lane: TeamWorkspaceLane;
  section?: string;
}) => `/team/${lane}/${section}`;

export const teamWorkspaceRoute = ({
  lane,
  section,
}: {
  lane: string | undefined;
  section: string | undefined;
}): { lane: TeamWorkspaceLane; section: TeamWorkspaceSection } | null => {
  if (!isTeamWorkspaceLane(lane)) return null;
  if (!isTeamWorkspaceSectionForLane({ lane, section })) return null;
  return { lane, section: section as TeamWorkspaceSection };
};
