import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1788992465889)
export class CreateWorkspaceCreationRequestFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."workspaceCreationRequest" ("userId" uuid NOT NULL, "requestId" uuid NOT NULL, "payloadHash" character varying(64) NOT NULL, "workspaceId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7fcaea47085a1ae579ff91c8b8c" PRIMARY KEY ("userId", "requestId"))');
    await queryRunner.query('ALTER TABLE "core"."workspaceCreationRequest" ADD CONSTRAINT "FK_cd940349a405f1129eace18354f" FOREIGN KEY ("userId") REFERENCES "core"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."workspaceCreationRequest" DROP CONSTRAINT "FK_cd940349a405f1129eace18354f"');
    await queryRunner.query('DROP TABLE "core"."workspaceCreationRequest"');
  }
}
