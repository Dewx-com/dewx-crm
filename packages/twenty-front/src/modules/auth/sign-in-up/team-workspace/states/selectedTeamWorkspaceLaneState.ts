import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import {
  isSignInDoor,
  type SignInDoor,
} from '@/team-workspace/role/types/TeamWorkspaceLane';

export const selectedTeamWorkspaceLaneState = createAtomState<SignInDoor | null>(
  {
    key: 'selectedTeamWorkspaceLaneState',
    defaultValue: null,
    useSessionStorage: true,
    validateInitFn: isSignInDoor,
  },
);
