import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { TeamWorkspaceSnapshotDTO } from 'src/engine/core-modules/team-workspace/dtos/team-workspace-snapshot.dto';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';

@ObjectType('TeamManagementMember')
export class TeamManagementMemberDTO {
  @Field(() => UUIDScalarType)
  id!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => TeamWorkspaceLane)
  lane!: TeamWorkspaceLane;
}

@ObjectType('TeamManagementSnapshot')
export class TeamManagementSnapshotDTO {
  @Field(() => String)
  generatedAt!: string;

  @Field(() => [TeamManagementMemberDTO])
  members!: TeamManagementMemberDTO[];

  @Field(() => TeamWorkspaceSnapshotDTO)
  sales!: TeamWorkspaceSnapshotDTO;

  @Field(() => TeamWorkspaceSnapshotDTO)
  operations!: TeamWorkspaceSnapshotDTO;
}
