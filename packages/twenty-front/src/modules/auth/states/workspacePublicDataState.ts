import { type PublicWorkspaceData } from '~/generated-metadata/graphql';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export type WorkspacePublicData = PublicWorkspaceData & {
  isTeamWorkspaceDomainAlias: boolean;
};

export const workspacePublicDataState =
  createAtomState<WorkspacePublicData | null>({
    key: 'workspacePublicDataState',
    defaultValue: null,
  });
