import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType()
export class TeamWorkspaceCommandReceiptDto {
  @Field(() => String)
  command!: string;

  @Field(() => String)
  receiptKey!: string;

  @Field(() => UUIDScalarType)
  targetId!: string;

  @Field(() => UUIDScalarType)
  sideEffectRecordId!: string;

  @Field(() => String)
  payloadHash!: string;

  @Field(() => String)
  resultState!: string;

  @Field(() => String)
  resultVersion!: string;

  @Field(() => String)
  committedAt!: string;

  @Field(() => Boolean)
  replayed!: boolean;
}
