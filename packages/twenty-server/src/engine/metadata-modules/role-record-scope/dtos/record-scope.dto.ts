import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// Prospect Engine (AGPL): the slice of a role's record scope a seat is allowed to know about itself —
// which field, which value — carried on ObjectPermission so the front end can render the client
// shell for a scoped seat without guessing. Never the role id, never other roles' scopes.
@ObjectType('RecordScope')
export class RecordScopeDTO {
  @Field(() => UUIDScalarType, { nullable: false })
  fieldMetadataId: string;

  @Field(() => String, { nullable: false })
  value: string;
}
