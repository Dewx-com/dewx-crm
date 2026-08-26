import { Field, InputType } from '@nestjs/graphql';

import { IsIn, IsISO8601, IsString, IsUUID, Matches } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

export const TEAM_WORKSPACE_ACTIVE_TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
] as const;

export type TeamWorkspaceActiveTaskStatus =
  (typeof TEAM_WORKSPACE_ACTIVE_TASK_STATUSES)[number];

@InputType()
export class TransitionTeamWorkspaceTaskInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  taskId!: string;

  @Field(() => String)
  @IsIn(TEAM_WORKSPACE_ACTIVE_TASK_STATUSES)
  expectedStatus!: TeamWorkspaceActiveTaskStatus;

  @Field(() => String)
  @IsISO8601({ strict: true })
  expectedVersion!: string;

  @Field(() => String)
  @IsIn(TEAM_WORKSPACE_ACTIVE_TASK_STATUSES)
  nextStatus!: TeamWorkspaceActiveTaskStatus;

  @Field(() => String)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/)
  idempotencyKey!: string;
}
