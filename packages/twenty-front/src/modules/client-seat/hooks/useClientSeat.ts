import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { clientScopeFromPermissions } from '@/client-seat/utils/clientScopeFromPermissions';
import {
  nameOfScope,
  slugOfScope,
} from '@/client-workspace/hooks/useClientWorkspace';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

type ClientRecordLite = {
  __typename: string;
  id: string;
  name?: string | null;
  slug?: string | null;
  client?: string | null;
};

type ClientSeatRecordsData = {
  clients?: { edges?: { node: ClientRecordLite }[] | null } | null;
};

// A plain query on the core client, not useFindManyRecords: that hook resolves the "client"
// object's metadata synchronously and throws ObjectMetadataItemNotFoundError while the metadata
// store is still empty, which is the first render in any fresh browser. Seen 2026-08-28 06:40
// (Roki, app.dewx.com, new origin so no cached state): 'Object metadata item "client" cannot be
// found in an array of 0 elements' at the app root. This query runs only once the store holds
// a "client" object and the seat is scoped.
const CLIENT_SEAT_RECORDS = gql`
  query ClientSeatRecords {
    clients(first: 2) {
      edges {
        node {
          id
          name
          slug
          client
        }
      }
    }
  }
`;

/**
 * Prospect Engine: is this seat a client's, and which client?
 *
 * Roki, 2026-08-25, signed in as Glenn (Fr8labs): "why is it written Prospect Engine at the top?
 * It should show Fr8labs — it should be the CRM of Fr8labs." The answer needs one fact the app did
 * not have: that the seat is scoped. The server now sends the role's record scopes with the
 * object permissions; a scope on any object's `client` field makes this a client seat, and its
 * value names the client. The client's own Client record (the only one its scope lets it read)
 * gives the human name and slug; the scope value is the fallback while that record loads.
 */
export const useClientSeat = () => {
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

  const clientValue = useMemo(() => {
    const clientFieldIds = new Set<string>();
    for (const item of objectMetadataItems) {
      for (const field of item.fields) {
        if (field.name === 'client') clientFieldIds.add(field.id);
      }
    }
    return clientScopeFromPermissions(
      Object.values(objectPermissionsByObjectMetadataId),
      clientFieldIds,
    );
  }, [objectMetadataItems, objectPermissionsByObjectMetadataId]);

  const isClientSeat = clientValue !== null;

  const hasClientObject = objectMetadataItems.some(
    (item) => item.nameSingular === 'client',
  );

  const apolloCoreClient = useApolloCoreClient();
  const { data } = useQuery<ClientSeatRecordsData>(CLIENT_SEAT_RECORDS, {
    client: apolloCoreClient,
    skip: !isClientSeat || !hasClientObject,
  });

  const records = useMemo(
    () => data?.clients?.edges?.map((edge) => edge.node) ?? [],
    [data],
  );

  const record =
    records?.find((row) => row.client === clientValue) ?? records?.[0] ?? null;

  return {
    isClientSeat,
    clientValue,
    clientName:
      (record?.name ?? '').trim() ||
      (clientValue ? nameOfScope(clientValue) : ''),
    clientSlug:
      (record?.slug ?? '').trim() ||
      (clientValue ? slugOfScope(clientValue) : ''),
  };
};
