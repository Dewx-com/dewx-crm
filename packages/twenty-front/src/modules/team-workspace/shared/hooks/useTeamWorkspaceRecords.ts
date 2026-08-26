import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { type TeamWorkspaceLane } from '@/team-workspace/role/types/TeamWorkspaceLane';
import { TEAM_TASK_STATUS } from '@/team-workspace/shared/constants/teamWorkspaceTaskStatus';
import {
  GET_TEAM_WORKSPACE_SNAPSHOT,
  type GetTeamWorkspaceSnapshotQuery,
  type GetTeamWorkspaceSnapshotQueryVariables,
  type TeamWorkspaceSnapshotLane,
} from '@/team-workspace/shared/graphql/queries/getTeamWorkspaceSnapshot';
import { teamWorkspaceRecordsFromSnapshot } from '@/team-workspace/shared/utils/teamWorkspaceSnapshotAdapter';

// This remains the minimal response projection used by the generic write hooks.
// Team workspace reads do not use the generic object-record API anymore.
export const TEAM_TASK_FIELDS = {
  id: true,
  title: true,
  status: true,
  workType: true,
  client: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
  assignee: { id: true, name: true },
};

const snapshotLaneOf = (lane: TeamWorkspaceLane): TeamWorkspaceSnapshotLane =>
  lane === 'sales' ? 'SALES' : 'OPERATIONS';

export const useTeamWorkspaceRecords = (
  lane: TeamWorkspaceLane,
  skipAll = false,
  _currentWorkspaceMemberId?: string,
) => {
  // Kept for caller compatibility while the server, rather than the browser,
  // resolves the authenticated member scope.
  void _currentWorkspaceMemberId;

  const snapshotQuery = useQuery<
    GetTeamWorkspaceSnapshotQuery,
    GetTeamWorkspaceSnapshotQueryVariables
  >(GET_TEAM_WORKSPACE_SNAPSHOT, {
    variables: { lane: snapshotLaneOf(lane) },
    skip: skipAll,
    fetchPolicy: 'cache-and-network',
  });

  const records = useMemo(
    () =>
      teamWorkspaceRecordsFromSnapshot(
        snapshotQuery.data?.teamWorkspaceSnapshot,
      ),
    [snapshotQuery.data?.teamWorkspaceSnapshot],
  );

  return {
    records,
    counts: {
      openTasks: records.tasks.filter(
        (task) => task.status?.toUpperCase() !== TEAM_TASK_STATUS.done,
      ).length,
      opportunities: records.opportunities.length,
      clients: records.clients.length,
    },
    loading: snapshotQuery.loading,
    errors: snapshotQuery.error ? [snapshotQuery.error] : [],
    refetch: snapshotQuery.refetch,
  };
};
