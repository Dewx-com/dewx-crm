import { clientScopeFromPermissions } from '@/client-seat/utils/clientScopeFromPermissions';

const base = {
  canReadObjectRecords: true,
  canUpdateObjectRecords: false,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
  restrictedFields: {},
  rowLevelPermissionPredicates: [],
  rowLevelPermissionPredicateGroups: [],
};

describe('clientScopeFromPermissions', () => {
  it('finds the client value from a scope on a client field', () => {
    const value = clientScopeFromPermissions(
      [
        {
          ...base,
          objectMetadataId: 'o-person',
          recordScopes: [
            { fieldMetadataId: 'f-person-client', value: 'FR8LABS' },
          ],
        },
        {
          ...base,
          objectMetadataId: 'o-member',
          recordScopes: [
            { fieldMetadataId: 'f-member-email', value: '__none__' },
          ],
        },
      ],
      new Set(['f-person-client']),
    );
    expect(value).toBe('FR8LABS');
  });

  it('is null for a staff seat (no scope on a client field) and for the hardening scopes alone', () => {
    expect(
      clientScopeFromPermissions(
        [{ ...base, objectMetadataId: 'o-person' }],
        new Set(['f-person-client']),
      ),
    ).toBeNull();
    expect(
      clientScopeFromPermissions(
        [
          {
            ...base,
            objectMetadataId: 'o-member',
            recordScopes: [
              { fieldMetadataId: 'f-member-email', value: '__none__' },
            ],
          },
        ],
        new Set(['f-person-client']),
      ),
    ).toBeNull();
  });
});
