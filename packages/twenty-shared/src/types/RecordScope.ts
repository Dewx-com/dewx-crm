// Prospect Engine (2026-08-21). A record scope restricts a role to the rows of one object whose
// <field> equals <value> — e.g. a client role sees only records where client = MCS_MICROMINDER.
// Stored in core.roleRecordScope (our own table), attached to ObjectPermissions by the
// roles-permissions cache, enforced by twenty-orm/utils/apply-record-scope.util.ts.
export type RecordScope = {
  fieldMetadataId: string;
  value: string;
};
