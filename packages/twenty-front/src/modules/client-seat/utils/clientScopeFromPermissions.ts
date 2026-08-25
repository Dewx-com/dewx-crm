import { type ObjectPermissions } from 'twenty-shared/types';

// Prospect Engine: a seat is a CLIENT seat when its role carries a record scope on a `client`
// field — the server puts that scope on every ObjectPermission it computes (our AGPL feature).
// Pure, so the shell's one decision is pinned by a test and never by a heuristic like
// "how many Client records can this person see".
export const clientScopeFromPermissions = (
  permissions: Iterable<ObjectPermissions & { objectMetadataId: string }>,
  clientFieldMetadataIds: ReadonlySet<string>,
): string | null => {
  for (const permission of permissions) {
    for (const scope of permission.recordScopes ?? []) {
      if (clientFieldMetadataIds.has(scope.fieldMetadataId) && scope.value) {
        return scope.value;
      }
    }
  }
  return null;
};
