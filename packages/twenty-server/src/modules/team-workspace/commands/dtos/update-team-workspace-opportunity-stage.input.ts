import { Field, InputType } from '@nestjs/graphql';

import { IsIn, IsISO8601, IsString, IsUUID, Matches } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

export const TEAM_WORKSPACE_NON_CUSTOMER_OPPORTUNITY_STAGES = [
  'NEW',
  'SCREENING',
  'MEETING',
  'PROPOSAL',
  'DECISION',
  'LOST',
  'NURTURE',
  'DNC',
] as const;

export type TeamWorkspaceNonCustomerOpportunityStage =
  (typeof TEAM_WORKSPACE_NON_CUSTOMER_OPPORTUNITY_STAGES)[number];

@InputType()
export class UpdateTeamWorkspaceOpportunityStageInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  opportunityId!: string;

  @Field(() => String)
  @IsIn(TEAM_WORKSPACE_NON_CUSTOMER_OPPORTUNITY_STAGES)
  expectedStage!: TeamWorkspaceNonCustomerOpportunityStage;

  @Field(() => String)
  @IsISO8601({ strict: true })
  expectedVersion!: string;

  @Field(() => String)
  @IsIn(TEAM_WORKSPACE_NON_CUSTOMER_OPPORTUNITY_STAGES)
  nextStage!: TeamWorkspaceNonCustomerOpportunityStage;

  @Field(() => String)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/)
  idempotencyKey!: string;
}
