import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import {
  GET_TEAM_MANAGEMENT_SNAPSHOT,
  type GetTeamManagementSnapshotQuery,
} from '@/team-workspace/shared/graphql/queries/getTeamManagementSnapshot';
import { teamWorkspaceRecordsFromSnapshot } from '@/team-workspace/shared/utils/teamWorkspaceSnapshotAdapter';

export const useTeamManagementRecords = (skip = false) => {
  // Served on the record endpoint, see useTeamWorkspaceRecords.
  const apolloCoreClient = useApolloCoreClient();
  const query = useQuery<GetTeamManagementSnapshotQuery>(
    GET_TEAM_MANAGEMENT_SNAPSHOT,
    {
      client: apolloCoreClient,
      skip,
      fetchPolicy: 'cache-and-network',
    },
  );
  const snapshot = query.data?.teamManagementSnapshot;
  const salesRecords = useMemo(
    () => teamWorkspaceRecordsFromSnapshot(snapshot?.sales),
    [snapshot?.sales],
  );
  const operationsRecords = useMemo(
    () => teamWorkspaceRecordsFromSnapshot(snapshot?.operations),
    [snapshot?.operations],
  );

  return {
    snapshot,
    salesRecords,
    operationsRecords,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
  };
};
