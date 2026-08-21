// The one definition of the table, used by the instance command and by the service's idempotent
// boot check, so a fresh install and an upgraded install end up identical.
export const ROLE_RECORD_SCOPE_TABLE_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS "core"."roleRecordScope" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" uuid NOT NULL,
    "roleId" uuid NOT NULL,
    "objectMetadataId" uuid NOT NULL,
    "fieldMetadataId" uuid NOT NULL,
    "value" text NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "PK_roleRecordScope" PRIMARY KEY ("id"),
    CONSTRAINT "IDX_ROLE_RECORD_SCOPE_ROLE_ID_OBJECT_METADATA_ID_UNIQUE" UNIQUE ("roleId", "objectMetadataId"),
    CONSTRAINT "FK_roleRecordScope_role" FOREIGN KEY ("roleId") REFERENCES "core"."role"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_ROLE_RECORD_SCOPE_WORKSPACE_ID" ON "core"."roleRecordScope" ("workspaceId")`,
];
