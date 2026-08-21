import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';
import { ROLE_RECORD_SCOPE_TABLE_SQL } from 'src/engine/metadata-modules/role-record-scope/constants/role-record-scope-table-sql.constant';

// Prospect Engine: the table behind record scopes (per-role row filters), our own AGPL feature.
@RegisteredInstanceCommand('2.32.0', 1787000000000)
export class CreateRoleRecordScopeTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ROLE_RECORD_SCOPE_TABLE_SQL) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "core"."roleRecordScope"');
  }
}
