import { useMemo } from 'react';

import { clientScopeFromPermissions } from '@/client-seat/utils/clientScopeFromPermissions';
import { nameOfScope, slugOfScope } from '@/client-workspace/hooks/useClientWorkspace';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

type ClientRecordLite = { id: string; name?: string | null; slug?: string | null; client?: string | null };

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

  const { records } = useFindManyRecords<ClientRecordLite>({
    objectNameSingular: 'client',
    recordGqlFields: { id: true, name: true, slug: true, client: true },
    limit: 2,
    skip: !isClientSeat,
  });

  const record =
    records?.find((row) => row.client === clientValue) ?? records?.[0] ?? null;

  return {
    isClientSeat,
    clientValue,
    clientName: (record?.name ?? '').trim() || (clientValue ? nameOfScope(clientValue) : ''),
    clientSlug: (record?.slug ?? '').trim() || (clientValue ? slugOfScope(clientValue) : ''),
  };
};
