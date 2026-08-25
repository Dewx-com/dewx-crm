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
    CONSTRAINT "IDX_ROLE_RECORD_SCOPE_ROLE_OBJECT_FIELD_UNIQUE" UNIQUE ("roleId", "objectMetadataId", "fieldMetadataId"),
    CONSTRAINT "FK_roleRecordScope_role" FOREIGN KEY ("roleId") REFERENCES "core"."role"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_ROLE_RECORD_SCOPE_WORKSPACE_ID" ON "core"."roleRecordScope" ("workspaceId")`,
  // An install created before 2026-08-22 carries the old one-condition-per-object constraint. It has
  // to go, or a role can never hold two conditions on the same object — which is how a client could
  // read every draft of their own: "client = X" took the only slot, so "status = PUBLISHED" could not
  // be added. Dropping a constraint that is already gone is not an error with IF EXISTS.
  `ALTER TABLE "core"."roleRecordScope" DROP CONSTRAINT IF EXISTS "IDX_ROLE_RECORD_SCOPE_ROLE_ID_OBJECT_METADATA_ID_UNIQUE"`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'IDX_ROLE_RECORD_SCOPE_ROLE_OBJECT_FIELD_UNIQUE'
     ) THEN
       ALTER TABLE "core"."roleRecordScope"
         ADD CONSTRAINT "IDX_ROLE_RECORD_SCOPE_ROLE_OBJECT_FIELD_UNIQUE"
         UNIQUE ("roleId", "objectMetadataId", "fieldMetadataId");
     END IF;
   END $$`,
];
