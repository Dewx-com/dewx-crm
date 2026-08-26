import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

export enum TeamWorkspaceCommandLane {
  SALES = 'SALES',
  OPERATIONS = 'OPERATIONS',
}

export enum TeamWorkspaceProtocolTaskKind {
  MEETING_PREP = 'MEETING_PREP',
  MEETING_OUTCOME = 'MEETING_OUTCOME',
  COACHING_LESSON = 'COACHING_LESSON',
  CLIENT_UPDATE = 'CLIENT_UPDATE',
  BLOCKER = 'BLOCKER',
  HANDOFF_RETURN = 'HANDOFF_RETURN',
}

export enum TeamWorkspaceMeetingOutcome {
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(TeamWorkspaceCommandLane, {
  name: 'TeamWorkspaceCommandLane',
});

registerEnumType(TeamWorkspaceProtocolTaskKind, {
  name: 'TeamWorkspaceProtocolTaskKind',
});

registerEnumType(TeamWorkspaceMeetingOutcome, {
  name: 'TeamWorkspaceMeetingOutcome',
});

@InputType()
export class CreateTeamWorkspaceProtocolTaskInput {
  @Field(() => TeamWorkspaceProtocolTaskKind)
  @IsEnum(TeamWorkspaceProtocolTaskKind)
  kind!: TeamWorkspaceProtocolTaskKind;

  @Field(() => TeamWorkspaceCommandLane)
  @IsEnum(TeamWorkspaceCommandLane)
  lane!: TeamWorkspaceCommandLane;

  @Field(() => UUIDScalarType)
  @IsUUID()
  targetId!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  @Matches(/\S/)
  content!: string;

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

  @Field(() => TeamWorkspaceMeetingOutcome, { nullable: true })
  @IsOptional()
  @IsEnum(TeamWorkspaceMeetingOutcome)
  meetingOutcome?: TeamWorkspaceMeetingOutcome;

  @Field(() => String)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/)
  idempotencyKey!: string;
}
