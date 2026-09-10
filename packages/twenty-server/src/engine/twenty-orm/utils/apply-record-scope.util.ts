import {
  FieldMetadataType,
  type ObjectsPermissions,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type ObjectLiteral } from 'typeorm';
import { type QueryExpressionMap } from 'typeorm/query-builder/QueryExpressionMap';

import { type WorkspaceInternalContext } from 'src/engine/twenty-orm/interfaces/workspace-internal-context.interface';

import { computeColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-column-name.util';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { isMorphOrRelationFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';
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

// Structural on purpose: the workspace builders are generic subclasses of TypeORM's select / update /
// delete / soft-delete builders, and `this` of a generic subclass is not assignable to the concrete
// TypeORM types. Everything we need is these three members, shared by all four.
type ScopedQueryBuilder = {
  expressionMap: QueryExpressionMap;
  andWhere: (where: string, parameters?: ObjectLiteral) => unknown;
  setParameter: (key: string, value: unknown) => unknown;
};

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

  if (!isDefined(alias)) {
    return;
  }

  if (alreadyApplied(queryBuilder, alias)) {
    return;
  }

  for (const condition of attachmentTargetConditions({
    queryBuilder,
    objectMetadata,
    alias,
    objectsPermissions,
    internalContext,
  })) {
    queryBuilder.andWhere(condition);
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
  queryBuilder: ScopedQueryBuilder;
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

    if (!isDefined(objectMetadataId)) {
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
      throw new PermissionsException(
        PermissionsExceptionMessage.PERMISSION_DENIED,
        PermissionsExceptionCode.PERMISSION_DENIED,
      );
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

    conditions.push(
      ...attachmentTargetConditions({
        queryBuilder,
        objectMetadata,
        alias,
        objectsPermissions,
        internalContext,
      }),
    );
    if (conditions.length === 0) continue;

    const scopeCondition = conditions.join(' AND ');

    joinAttribute.condition = isDefined(joinAttribute.condition)
      ? `(${joinAttribute.condition}) AND ${scopeCondition}`
      : scopeCondition;
  }
};

// Attachments inherit their target's visibility. Filtering the current row here
// also prevents moving, deleting, or exporting a hidden attachment through its ID.
const attachmentTargetConditions = ({
  queryBuilder,
  objectMetadata,
  alias,
  objectsPermissions,
  internalContext,
}: {
  queryBuilder: ScopedQueryBuilder;
  objectMetadata: FlatObjectMetadata;
  alias: string;
  objectsPermissions: ObjectsPermissions;
  internalContext: WorkspaceInternalContext;
}): string[] => {
  if (objectMetadata.nameSingular !== 'attachment') return [];
  const conditions: string[] = [];
  for (const field of Object.values(
    internalContext.flatFieldMetadataMaps.byUniversalIdentifier,
  )) {
    if (
      !field ||
      field.objectMetadataId !== objectMetadata.id ||
      !isMorphOrRelationFlatFieldMetadata(field) ||
      !field.name.startsWith('target') ||
      !field.settings.joinColumnName
    )
      continue;
    const column = `${escapeIdentifier(alias)}.${escapeIdentifier(field.settings.joinColumnName)}`;
    const parent = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: field.relationTargetObjectMetadataId,
      flatEntityMaps: internalContext.flatObjectMetadataMaps,
    });
    if (!parent) return deny();
    const permissions = objectsPermissions[parent.id];
    if (!parent.isSystem && !permissions?.canReadObjectRecords) {
      conditions.push(`${column} IS NULL`);
      continue;
    }
    const parentAlias = `peAttachmentTarget${conditions.length}`;
    const parentColumn = (name: string) =>
      `${escapeIdentifier(parentAlias)}.${escapeIdentifier(name)}`;
    const parentConditions = [
      `${parentColumn('id')} = ${column}`,
      `${parentColumn('deletedAt')} IS NULL`,
    ];
    for (const [index, scope] of (permissions?.recordScopes ?? []).entries()) {
      const parameter = `peAttachmentScope_${alias}_${conditions.length}_${index}`;
      const scopeColumn = resolveScopeColumnName({
        fieldMetadataId: scope.fieldMetadataId,
        objectMetadata: parent,
        internalContext,
      });
      queryBuilder.setParameter(parameter, scope.value);
      parentConditions.push(`${parentColumn(scopeColumn)} = :${parameter}`);
    }
    const table = `${escapeIdentifier(getWorkspaceSchemaName(internalContext.workspaceId))}.${escapeIdentifier(computeObjectTargetTable(parent))}`;
    conditions.push(
      `(${column} IS NULL OR EXISTS (SELECT 1 FROM ${table} ${escapeIdentifier(parentAlias)} WHERE ${parentConditions.join(' AND ')}))`,
    );
  }
  return conditions;
};
