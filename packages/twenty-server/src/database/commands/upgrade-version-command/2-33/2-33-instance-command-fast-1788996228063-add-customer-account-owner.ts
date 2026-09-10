import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1788996228063)
export class AddCustomerAccountOwnerFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."workspace" ADD "primaryOwnerUserId" uuid');
    await queryRunner.query('ALTER TABLE "core"."workspace" ADD CONSTRAINT "FK_09267a1f94a97a620b01da1d68f" FOREIGN KEY ("primaryOwnerUserId") REFERENCES "core"."user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION');
    // Only explicit signup receipts establish ownership; legacy accounts need
    // an owner chosen during client migration, never an inferred oldest member.
    await queryRunner.query(`
      UPDATE core.workspace w SET "primaryOwnerUserId" = receipt."userId"
      FROM core."workspaceCreationRequest" receipt
      JOIN core."userWorkspace" uw ON uw."userId" = receipt."userId"
        AND uw."workspaceId" = receipt."workspaceId" AND uw."deletedAt" IS NULL
      JOIN core."user" u ON u.id = receipt."userId" AND u."deletedAt" IS NULL
      JOIN core."roleTarget" rt ON rt."userWorkspaceId" = uw.id AND rt."workspaceId" = uw."workspaceId"
      JOIN core.role r ON r.id = rt."roleId" AND r."workspaceId" = uw."workspaceId"
      WHERE w.id = receipt."workspaceId" AND w."deletedAt" IS NULL
        AND r."universalIdentifier" = '20202020-02c2-43f2-b94d-cab1f2b532eb'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."workspace" DROP CONSTRAINT "FK_09267a1f94a97a620b01da1d68f"');
    await queryRunner.query('ALTER TABLE "core"."workspace" DROP COLUMN "primaryOwnerUserId"');
  }
}
