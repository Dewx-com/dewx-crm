import { Field, InputType } from '@nestjs/graphql';

import {
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class WinOpportunityWithHandoffInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  opportunityId!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  @Matches(/^[^\r\n]+$/)
  expectedStage!: string;

  @Field(() => String)
  @IsISO8601({ strict: true })
  expectedVersion!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(/\S/)
  @Matches(/^[^\r\n]+$/)
  company!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(/\S/)
  @Matches(/^[^\r\n]+$/)
  contact!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(/\S/)
  @Matches(/^[^\r\n]+$/)
  client!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  @Matches(/\S/)
  problem!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  @Matches(/\S/)
  agreedScope!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  @Matches(/\S/)
  promises!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  @Matches(/\S/)
  nextCommitment!: string;

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
