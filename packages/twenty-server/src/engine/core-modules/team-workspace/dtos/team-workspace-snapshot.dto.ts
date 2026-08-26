import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';

export enum TeamWorkspaceTranscriptStatus {
  AVAILABLE = 'AVAILABLE',
  PROCESSING = 'PROCESSING',
  MISSING = 'MISSING',
}

registerEnumType(TeamWorkspaceTranscriptStatus, {
  name: 'TeamWorkspaceTranscriptStatus',
  description: 'Availability of the bounded coaching evidence projection.',
});

@ObjectType('TeamWorkspaceTask')
export class TeamWorkspaceTaskDTO {
  @Field(() => UUIDScalarType)
  id!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  workType!: string | null;

  @Field(() => String, { nullable: true })
  clientScope!: string | null;

  @Field(() => String, { nullable: true })
  dueAt!: string | null;

  @Field(() => String, { nullable: true })
  createdAt!: string | null;

  @Field(() => String, { nullable: true })
  updatedAt!: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  assigneeId!: string | null;

  @Field(() => String, { nullable: true })
  assigneeName!: string | null;

  @Field(() => String, { nullable: true })
  bodyMarkdown!: string | null;

  @Field(() => String, { nullable: true })
  assignmentDetail!: string | null;

  @Field(() => String, { nullable: true })
  createdByName!: string | null;
}

@ObjectType('TeamWorkspaceOpportunity')
export class TeamWorkspaceOpportunityDTO {
  @Field(() => UUIDScalarType)
  id!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  stage!: string | null;

  @Field(() => String, { nullable: true })
  clientScope!: string | null;

  @Field(() => String, { nullable: true })
  closeDate!: string | null;

  @Field(() => String, { nullable: true })
  createdAt!: string | null;

  @Field(() => String, { nullable: true })
  updatedAt!: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  ownerId!: string | null;

  @Field(() => String, { nullable: true })
  ownerName!: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  companyId!: string | null;

  @Field(() => String, { nullable: true })
  companyName!: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  pointOfContactId!: string | null;

  @Field(() => String, { nullable: true })
  pointOfContactName!: string | null;
}

@ObjectType('TeamWorkspaceClient')
export class TeamWorkspaceClientDTO {
  @Field(() => UUIDScalarType)
  id!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  slug!: string | null;

  @Field(() => String, { nullable: true })
  clientScope!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;
}

@ObjectType('TeamWorkspaceMeetingParticipant')
export class TeamWorkspaceMeetingParticipantDTO {
  @Field(() => UUIDScalarType)
  id!: string;

  @Field(() => String, { nullable: true })
  displayName!: string | null;

  @Field(() => Boolean, { nullable: true })
  isOrganizer!: boolean | null;

  @Field(() => String, { nullable: true })
  responseStatus!: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  personId!: string | null;

  @Field(() => String, { nullable: true })
  personName!: string | null;

  @Field(() => String, { nullable: true })
  clientScope!: string | null;

  @Field(() => String, { nullable: true })
  companyName!: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  workspaceMemberId!: string | null;

  @Field(() => String, { nullable: true })
  workspaceMemberName!: string | null;
}

@ObjectType('TeamWorkspaceMeeting')
export class TeamWorkspaceMeetingDTO {
  @Field(() => UUIDScalarType)
  id!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  startsAt!: string | null;

  @Field(() => String, { nullable: true })
  endsAt!: string | null;

  @Field(() => Boolean, { nullable: true })
  isCanceled!: boolean | null;

  @Field(() => Boolean, { nullable: true })
  isFullDay!: boolean | null;

  @Field(() => String, { nullable: true })
  conferenceUrl!: string | null;

  @Field(() => [TeamWorkspaceMeetingParticipantDTO])
  participants!: TeamWorkspaceMeetingParticipantDTO[];
}

@ObjectType('TeamWorkspaceCallRecording')
export class TeamWorkspaceCallRecordingDTO {
  @Field(() => UUIDScalarType)
  id!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  startedAt!: string | null;

  @Field(() => String, { nullable: true })
  endedAt!: string | null;

  @Field(() => String, { nullable: true })
  createdAt!: string | null;

  @Field(() => String, { nullable: true })
  summaryMarkdown!: string | null;

  @Field(() => TeamWorkspaceTranscriptStatus)
  transcriptStatus!: TeamWorkspaceTranscriptStatus;

  @Field(() => String, { nullable: true })
  evidenceReference!: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  calendarEventId!: string | null;
}

@ObjectType('TeamWorkspaceSnapshot')
export class TeamWorkspaceSnapshotDTO {
  @Field(() => TeamWorkspaceLane)
  lane!: TeamWorkspaceLane;

  @Field(() => String)
  generatedAt!: string;

  @Field(() => [TeamWorkspaceTaskDTO])
  tasks!: TeamWorkspaceTaskDTO[];

  @Field(() => [TeamWorkspaceTaskDTO])
  handoffs!: TeamWorkspaceTaskDTO[];

  @Field(() => [TeamWorkspaceOpportunityDTO])
  opportunities!: TeamWorkspaceOpportunityDTO[];

  @Field(() => [TeamWorkspaceClientDTO])
  clients!: TeamWorkspaceClientDTO[];

  @Field(() => [TeamWorkspaceMeetingDTO])
  meetings!: TeamWorkspaceMeetingDTO[];

  @Field(() => [TeamWorkspaceCallRecordingDTO])
  callRecordings!: TeamWorkspaceCallRecordingDTO[];
}
