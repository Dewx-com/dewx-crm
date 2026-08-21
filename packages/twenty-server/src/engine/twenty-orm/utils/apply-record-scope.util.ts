import { FieldMetadataType, type ObjectsPermissions } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import {
  type DeleteQueryBuilder,
  type ObjectLiteral,
  type SelectQueryBuilder,
  type SoftDeleteQueryBuilder,
  type UpdateQueryBuilder,
} from 'typeorm';

import { type WorkspaceInternalContext } from 'src/engine/twenty-orm/interfaces/workspace-internal-context.interface';

import { computeColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-column-name.util';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import {
  PermissionsException,
  PermissionsExceptionCode,
  PermissionsExceptionMessage,
} from 'src/engine/metadata-modules/permissions/permissions.exception';

// ── Prospect Engine record scopes (2026-08-21) ────────────────────────────────────────────────
// Our own, AGPL-side row filter: a role's ObjectPermissions may carry `recordScopes` for an object
// (set through core.roleRecordScope, attached by the roles-permissions cache). When it does, every
// query on that object — as the main table or as a joined relation — is narrowed to rows whose
// <field> = <value>. Fail closed: a scope that points at a field we cannot resolve denies the query
// rather than silently widening it. Idempotent per query builder and alias, because the builders
// validate permissions more than once per statement.

type ScopedQueryBuilder =
  | SelectQueryBuilder<ObjectLiteral>
  | UpdateQueryBuilder<ObjectLiteral>
  | DeleteQueryBuilder<ObjectLiteral>
  | SoftDeleteQueryBuilder<ObjectLiteral>;

const appliedAliasesByBuilder = new WeakMap<object, Set<string>>();

const alreadyApplied = (queryBuilder: object, alias: string): boolean => {
  const applied = appliedAliasesByBuilder.get(queryBuilder);

  if (applied?.has(alias)) {
    return true;
  }

  appliedAliasesByBuilder.set(queryBuilder, (applied ?? new Set()).add(alias));

  return false;
};

const deny = (): never => {
  throw new PermissionsException(
    PermissionsExceptionMessage.PERMISSION_DENIED,
    PermissionsExceptionCode.PERMISSION_DENIED,
  );
};

export const resolveScopeColumnName = ({
  fieldMetadataId,
  objectMetadata,
  internalContext,
}: {
  fieldMetadataId: string;
  objectMetadata: FlatObjectMetadata;
  internalContext: WorkspaceInternalContext;
}): string => {
  const field = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: fieldMetadataId,
    flatEntityMaps: internalContext.flatFieldMetadataMaps,
  });

  if (!isDefined(field) || field.objectMetadataId !== objectMetadata.id) {
    return deny();
  }

  return computeColumnName(field.name, {
    isForeignKey: field.type === FieldMetadataType.RELATION,
  });
};

export const applyRecordScopeToMainAlias = ({
  queryBuilder,
  objectMetadata,
  objectsPermissions,
  internalContext,
}: {
  queryBuilder: ScopedQueryBuilder;
  objectMetadata: FlatObjectMetadata;
  objectsPermissions: ObjectsPermissions;
  internalContext: WorkspaceInternalContext;
}): void => {
  const scopes = objectsPermissions[objectMetadata.id]?.recordScopes ?? [];
  const alias = queryBuilder.expressionMap.mainAlias?.name;

  if (scopes.length === 0 || !isDefined(alias)) {
    return;
  }

  if (alreadyApplied(queryBuilder, alias)) {
    return;
  }

  scopes.forEach((scope, index) => {
    const column = resolveScopeColumnName({
      fieldMetadataId: scope.fieldMetadataId,
      objectMetadata,
      internalContext,
    });
    const parameter = `peRecordScope_${alias}_${index}`;

    queryBuilder.andWhere(`"${alias}"."${column}" = :${parameter}`, {
      [parameter]: scope.value,
    });
  });
};

export const applyRecordScopeToJoinedRelations = ({
  queryBuilder,
  objectsPermissions,
  internalContext,
}: {
  queryBuilder: SelectQueryBuilder<ObjectLiteral>;
  objectsPermissions: ObjectsPermissions;
  internalContext: WorkspaceInternalContext;
}): void => {
  for (const joinAttribute of queryBuilder.expressionMap.joinAttributes) {
    const joinedEntityMetadata = joinAttribute.metadata;

    if (
      !isDefined(joinedEntityMetadata) ||
      isDefined(joinAttribute.alias?.subQuery) ||
      typeof joinedEntityMetadata.target !== 'string'
    ) {
      continue;
    }

    const objectMetadataId =
      internalContext.objectIdByNameSingular[joinedEntityMetadata.target];
    const scopes = objectsPermissions[objectMetadataId]?.recordScopes ?? [];

    if (!isDefined(objectMetadataId) || scopes.length === 0) {
      continue;
    }

    const alias = joinAttribute.alias.name;

    if (alreadyApplied(queryBuilder, alias)) {
      continue;
    }

    const objectMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: objectMetadataId,
      flatEntityMaps: internalContext.flatObjectMetadataMaps,
    });

    if (!isDefined(objectMetadata)) {
      deny();
    }

    const conditions = scopes.map((scope, index) => {
      const column = resolveScopeColumnName({
        fieldMetadataId: scope.fieldMetadataId,
        objectMetadata,
        internalContext,
      });
      const parameter = `peRecordScope_${alias}_${index}`;

      queryBuilder.setParameter(parameter, scope.value);

      return `"${alias}"."${column}" = :${parameter}`;
    });

    const scopeCondition = conditions.join(' AND ');

    joinAttribute.condition = isDefined(joinAttribute.condition)
      ? `(${joinAttribute.condition}) AND ${scopeCondition}`
      : scopeCondition;
  }
};
