import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class DeleteRoleRecordScopeInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  roleId: string;

  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  objectMetadataId: string;

  /** One condition, by its field. Omitted, every condition on that object is dropped. */
  @IsUUID()
  @IsOptional()
  @Field(() => UUIDScalarType, { nullable: true })
  fieldMetadataId?: string;
}
