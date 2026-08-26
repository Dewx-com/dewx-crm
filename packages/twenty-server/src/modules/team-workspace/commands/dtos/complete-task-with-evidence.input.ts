import { Field, InputType } from '@nestjs/graphql';

import {
  IsIn,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

export const TEAM_WORKSPACE_COMPLETABLE_TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
] as const;

@InputType()
export class CompleteTaskWithEvidenceInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  taskId!: string;

  @Field(() => String)
  @IsIn(TEAM_WORKSPACE_COMPLETABLE_TASK_STATUSES)
  expectedStatus!: (typeof TEAM_WORKSPACE_COMPLETABLE_TASK_STATUSES)[number];

  @Field(() => String)
  @IsISO8601({ strict: true })
  expectedVersion!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  @Matches(/\S/)
  evidence!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  @Matches(/\S/)
  @Matches(/^[^\r\n]+$/)
  source!: string;

  @Field(() => String)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/)
  idempotencyKey!: string;
}
