import { Field, InputType } from '@nestjs/graphql';

import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { TeamWorkspaceCommandLane } from 'src/modules/team-workspace/commands/dtos/create-team-workspace-protocol-task.input';

@InputType()
export class CreateTeamWorkspaceAssignedWorkInput {
  @Field(() => TeamWorkspaceCommandLane)
  @IsEnum(TeamWorkspaceCommandLane)
  lane!: TeamWorkspaceCommandLane;

  @Field(() => UUIDScalarType)
  @IsUUID()
  assigneeId!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(/\S/)
  @Matches(/^[^\r\n]+$/)
  title!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  @Matches(/\S/)
  detail!: string;

  @Field(() => String)
  @IsISO8601({ strict: true })
  dueAt!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(/\S/)
  @Matches(/^[^\r\n]+$/)
  client?: string | null;

  @Field(() => String)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/)
  idempotencyKey!: string;
}
