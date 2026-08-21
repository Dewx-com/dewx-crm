import { FieldMetadataType } from 'twenty-shared/types';

import {
  applyRecordScopeToJoinedRelations,
  applyRecordScopeToMainAlias,
} from 'src/engine/twenty-orm/utils/apply-record-scope.util';

const PERSON_ID = 'b9c0d7e4-0000-4000-8000-000000000001';
const COMPANY_ID = 'b9c0d7e4-0000-4000-8000-000000000002';
const CLIENT_FIELD_ID = 'f1e2d3c4-0000-4000-8000-000000000010';

// The real FlatEntityMaps shape: id → universalIdentifier → entity (see flat-entity-maps.type.ts)
const maps = (entities: Record<string, object>) => ({
  universalIdentifierById: Object.fromEntries(Object.keys(entities).map((id) => [id, `uid-${id}`])),
  byUniversalIdentifier: Object.fromEntries(Object.entries(entities).map(([id, e]) => [`uid-${id}`, { ...e, universalIdentifier: `uid-${id}` }])),
  universalIdentifiersByApplicationId: {},
});

const internalContext = {
  flatFieldMetadataMaps: maps({
    [CLIENT_FIELD_ID]: {
      id: CLIENT_FIELD_ID,
      name: 'client',
      type: FieldMetadataType.SELECT,
      objectMetadataId: PERSON_ID,
    },
  }),
  flatObjectMetadataMaps: maps({
    [PERSON_ID]: { id: PERSON_ID, nameSingular: 'person' },
    [COMPANY_ID]: { id: COMPANY_ID, nameSingular: 'company' },
  }),
  objectIdByNameSingular: { person: PERSON_ID, company: COMPANY_ID },
  // oxlint-disable-next-line typescript/no-explicit-any
} as any;

const personObjectMetadata = { id: PERSON_ID, nameSingular: 'person' } as any;

const scoped = {
  [PERSON_ID]: {
    canReadObjectRecords: true,
    canUpdateObjectRecords: false,
    canSoftDeleteObjectRecords: false,
    canDestroyObjectRecords: false,
    restrictedFields: {},
    rowLevelPermissionPredicates: [],
    rowLevelPermissionPredicateGroups: [],
    recordScopes: [{ fieldMetadataId: CLIENT_FIELD_ID, value: 'MCS_MICROMINDER' }],
  },
} as any;

const makeSelectBuilder = (joinAttributes: any[] = []) => ({
  expressionMap: { mainAlias: { name: 'person' }, joinAttributes },
  andWhere: jest.fn(),
  setParameter: jest.fn(),
});

describe('applyRecordScopeToMainAlias', () => {
  it('narrows the main table to the scoped value', () => {
    const qb = makeSelectBuilder();

    applyRecordScopeToMainAlias({
      queryBuilder: qb as any,
      objectMetadata: personObjectMetadata,
      objectsPermissions: scoped,
      internalContext,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      '"person"."client" = :peRecordScope_person_0',
      { peRecordScope_person_0: 'MCS_MICROMINDER' },
    );
  });

  it('does nothing when the role has no scope on the object', () => {
    const qb = makeSelectBuilder();

    applyRecordScopeToMainAlias({
      queryBuilder: qb as any,
      objectMetadata: personObjectMetadata,
      objectsPermissions: { [PERSON_ID]: { ...scoped[PERSON_ID], recordScopes: [] } } as any,
      internalContext,
    });

    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('applies once per builder and alias even if validation runs twice', () => {
    const qb = makeSelectBuilder();
    const args = { queryBuilder: qb as any, objectMetadata: personObjectMetadata, objectsPermissions: scoped, internalContext };

    applyRecordScopeToMainAlias(args);
    applyRecordScopeToMainAlias(args);

    expect(qb.andWhere).toHaveBeenCalledTimes(1);
  });

  it('denies when the scope points at a field of another object (fail closed)', () => {
    const qb = makeSelectBuilder();
    const wrongField = {
      [COMPANY_ID]: { ...scoped[PERSON_ID], recordScopes: [{ fieldMetadataId: CLIENT_FIELD_ID, value: 'X' }] },
    } as any;

    expect(() =>
      applyRecordScopeToMainAlias({
        queryBuilder: qb as any,
        objectMetadata: { id: COMPANY_ID, nameSingular: 'company' } as any,
        objectsPermissions: wrongField,
        internalContext,
      }),
    ).toThrow();
    expect(qb.andWhere).not.toHaveBeenCalled();
  });
});

describe('applyRecordScopeToJoinedRelations', () => {
  it('adds the scope to the join condition of a scoped relation', () => {
    const join = { alias: { name: 'pointOfContact' }, metadata: { target: 'person' }, condition: '"opportunity"."pointOfContactId" = "pointOfContact"."id"' };
    const qb = makeSelectBuilder([join]);

    applyRecordScopeToJoinedRelations({ queryBuilder: qb as any, objectsPermissions: scoped, internalContext });

    expect(join.condition).toBe(
      '("opportunity"."pointOfContactId" = "pointOfContact"."id") AND "pointOfContact"."client" = :peRecordScope_pointOfContact_0',
    );
    expect(qb.setParameter).toHaveBeenCalledWith('peRecordScope_pointOfContact_0', 'MCS_MICROMINDER');
  });

  it('leaves unscoped relations and sub-queries alone', () => {
    const plain = { alias: { name: 'company' }, metadata: { target: 'company' }, condition: 'x = y' };
    const sub = { alias: { name: 'sq', subQuery: 'select 1' }, metadata: { target: 'person' }, condition: 'a = b' };
    const qb = makeSelectBuilder([plain, sub]);

    applyRecordScopeToJoinedRelations({ queryBuilder: qb as any, objectsPermissions: scoped, internalContext });

    expect(plain.condition).toBe('x = y');
    expect(sub.condition).toBe('a = b');
  });
});
