import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class UpsertRoleRecordScopeInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  roleId: string;

  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  objectMetadataId: string;

  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  fieldMetadataId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Field(() => String)
  value: string;
}
