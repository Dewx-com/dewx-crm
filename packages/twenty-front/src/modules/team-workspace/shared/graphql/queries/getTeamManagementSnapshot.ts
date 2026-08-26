import { gql } from '@apollo/client';

import { type TeamWorkspaceSnapshot } from '@/team-workspace/shared/graphql/queries/getTeamWorkspaceSnapshot';

export type TeamManagementMember = {
  id: string;
  name: string | null;
  lane: 'SALES' | 'OPERATIONS';
};

export type TeamManagementSnapshot = {
  generatedAt: string;
  members: TeamManagementMember[];
  sales: TeamWorkspaceSnapshot;
  operations: TeamWorkspaceSnapshot;
};

export type GetTeamManagementSnapshotQuery = {
  teamManagementSnapshot: TeamManagementSnapshot;
};

const TEAM_WORKSPACE_SNAPSHOT_FIELDS = gql`
  fragment TeamManagementLaneSnapshot on TeamWorkspaceSnapshot {
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
`;

export const GET_TEAM_MANAGEMENT_SNAPSHOT = gql`
  ${TEAM_WORKSPACE_SNAPSHOT_FIELDS}
  query GetTeamManagementSnapshot {
    teamManagementSnapshot {
      generatedAt
      members {
        id
        name
        lane
      }
      sales {
        ...TeamManagementLaneSnapshot
      }
      operations {
        ...TeamManagementLaneSnapshot
      }
    }
  }
`;
