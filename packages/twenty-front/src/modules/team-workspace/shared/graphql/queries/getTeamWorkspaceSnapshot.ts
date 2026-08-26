import { gql } from '@apollo/client';

export type TeamWorkspaceSnapshotLane = 'SALES' | 'OPERATIONS';

export type TeamWorkspaceSnapshotTask = {
  id: string;
  title: string | null;
  status: string | null;
  workType: string | null;
  clientScope: string | null;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  bodyMarkdown: string | null;
  assignmentDetail: string | null;
  createdByName: string | null;
};

export type TeamWorkspaceSnapshotOpportunity = {
  id: string;
  name: string | null;
  stage: string | null;
  clientScope: string | null;
  closeDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  ownerId: string | null;
  ownerName: string | null;
  companyId: string | null;
  companyName: string | null;
  pointOfContactId: string | null;
  pointOfContactName: string | null;
};

export type TeamWorkspaceSnapshotClient = {
  id: string;
  name: string | null;
  slug: string | null;
  clientScope: string | null;
  status: string | null;
};

export type TeamWorkspaceSnapshotMeetingParticipant = {
  id: string;
  displayName: string | null;
  isOrganizer: boolean | null;
  responseStatus: string | null;
  personId: string | null;
  personName: string | null;
  clientScope: string | null;
  companyName: string | null;
  workspaceMemberId: string | null;
  workspaceMemberName: string | null;
};

export type TeamWorkspaceSnapshotMeeting = {
  id: string;
  title: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isCanceled: boolean | null;
  isFullDay: boolean | null;
  conferenceUrl: string | null;
  participants: TeamWorkspaceSnapshotMeetingParticipant[];
};

export type TeamWorkspaceSnapshotCallRecording = {
  id: string;
  title: string | null;
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  summaryMarkdown: string | null;
  transcriptStatus: 'AVAILABLE' | 'PROCESSING' | 'MISSING';
  evidenceReference: string | null;
  calendarEventId: string | null;
};

export type TeamWorkspaceSnapshot = {
  lane: TeamWorkspaceSnapshotLane;
  generatedAt: string;
  tasks: TeamWorkspaceSnapshotTask[];
  handoffs: TeamWorkspaceSnapshotTask[];
  opportunities: TeamWorkspaceSnapshotOpportunity[];
  clients: TeamWorkspaceSnapshotClient[];
  meetings: TeamWorkspaceSnapshotMeeting[];
  callRecordings: TeamWorkspaceSnapshotCallRecording[];
};

export type GetTeamWorkspaceSnapshotQuery = {
  teamWorkspaceSnapshot: TeamWorkspaceSnapshot;
};

export type GetTeamWorkspaceSnapshotQueryVariables = {
  lane: TeamWorkspaceSnapshotLane;
};

// This document deliberately requests the bounded projection only. In
// particular, raw call transcripts are not part of the browser contract.
export const GET_TEAM_WORKSPACE_SNAPSHOT = gql`
  query GetTeamWorkspaceSnapshot($lane: TeamWorkspaceLane!) {
    teamWorkspaceSnapshot(lane: $lane) {
      lane
      generatedAt
      tasks {
        id
        title
        status
        workType
        clientScope
        dueAt
        createdAt
        updatedAt
        assigneeId
        assigneeName
        bodyMarkdown
        assignmentDetail
        createdByName
      }
      handoffs {
        id
        title
        status
        workType
        clientScope
        dueAt
        createdAt
        updatedAt
        assigneeId
        assigneeName
        bodyMarkdown
        assignmentDetail
        createdByName
      }
      opportunities {
        id
        name
        stage
        clientScope
        closeDate
        createdAt
        updatedAt
        ownerId
        ownerName
        companyId
        companyName
        pointOfContactId
        pointOfContactName
      }
      clients {
        id
        name
        slug
        clientScope
        status
      }
      meetings {
        id
        title
        description
        startsAt
        endsAt
        isCanceled
        isFullDay
        conferenceUrl
        participants {
          id
          displayName
          isOrganizer
          responseStatus
          personId
          personName
          clientScope
          companyName
          workspaceMemberId
          workspaceMemberName
        }
      }
      callRecordings {
        id
        title
        status
        startedAt
        endedAt
        createdAt
        summaryMarkdown
        transcriptStatus
        evidenceReference
        calendarEventId
      }
    }
  }
`;
