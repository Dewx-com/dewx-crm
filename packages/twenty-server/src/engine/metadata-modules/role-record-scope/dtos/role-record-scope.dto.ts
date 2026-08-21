import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('RoleRecordScope')
export class RoleRecordScopeDTO {
  @Field(() => UUIDScalarType, { nullable: false })
  id: string;

  @Field(() => UUIDScalarType, { nullable: false })
  roleId: string;

  @Field(() => UUIDScalarType, { nullable: false })
  objectMetadataId: string;

  @Field(() => UUIDScalarType, { nullable: false })
  fieldMetadataId: string;

  @Field(() => String, { nullable: false })
  value: string;
}
