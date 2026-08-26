import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import {
  isTeamWorkspaceLane,
  type TeamWorkspaceLane,
} from '@/team-workspace/role/types/TeamWorkspaceLane';

export const selectedTeamWorkspaceLaneState =
  createAtomState<TeamWorkspaceLane | null>({
    key: 'selectedTeamWorkspaceLaneState',
    defaultValue: null,
    useSessionStorage: true,
    validateInitFn: isTeamWorkspaceLane,
  });
