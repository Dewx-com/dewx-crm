import { type RestrictedFieldsPermissions } from './RestrictedFieldsPermissions';
import { type RecordScope } from './RecordScope';
import { type RowLevelPermissionPredicate } from './RowLevelPermissionPredicate';
import { type RowLevelPermissionPredicateGroup } from './RowLevelPermissionPredicateGroup';

export type ObjectPermissions = {
  canReadObjectRecords: boolean;
  canUpdateObjectRecords: boolean;
  canSoftDeleteObjectRecords: boolean;
  canDestroyObjectRecords: boolean;
  restrictedFields: RestrictedFieldsPermissions;
  rowLevelPermissionPredicates: RowLevelPermissionPredicate[];
  rowLevelPermissionPredicateGroups: RowLevelPermissionPredicateGroup[];
  // Prospect Engine: per-role row filter, see RecordScope.ts (absent = unscoped)
  recordScopes?: RecordScope[];
};
