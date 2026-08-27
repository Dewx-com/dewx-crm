import {
  type TeamWorkspaceSnapshot,
  type TeamWorkspaceSnapshotCallRecording,
  type TeamWorkspaceSnapshotMeeting,
  type TeamWorkspaceSnapshotOpportunity,
  type TeamWorkspaceSnapshotTask,
} from '@/team-workspace/shared/graphql/queries/getTeamWorkspaceSnapshot';
import {
  type TeamCalendarEventRecord,
  type TeamCallRecordingRecord,
  type TeamFullName,
  type TeamOpportunityRecord,
  type TeamTaskRecord,
  type TeamWorkspaceRecords,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';

const nameFromDisplayName = (displayName: string | null): TeamFullName | null =>
  displayName
    ? {
        firstName: displayName,
        lastName: null,
      }
    : null;

const taskFromSnapshot = (task: TeamWorkspaceSnapshotTask): TeamTaskRecord =>
  ({
    __typename: 'Task',
    id: task.id,
    title: task.title,
    status: task.status,
    workType: task.workType,
    client: task.clientScope,
    dueAt: task.dueAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignee: task.assigneeId
      ? {
          id: task.assigneeId,
          name: nameFromDisplayName(task.assigneeName),
        }
      : null,
    bodyV2:
      task.bodyMarkdown === null
        ? null
        : { blocknote: null, markdown: task.bodyMarkdown },
    assignmentDetail: task.assignmentDetail,
    createdBy: task.createdByName
      ? {
          source: null,
          workspaceMemberId: null,
          name: task.createdByName,
        }
      : null,
  }) as TeamTaskRecord;

const opportunityFromSnapshot = (
  opportunity: TeamWorkspaceSnapshotOpportunity,
): TeamOpportunityRecord =>
  ({
    __typename: 'Opportunity',
    id: opportunity.id,
    name: opportunity.name,
    stage: opportunity.stage,
    client: opportunity.clientScope,
    closeDate: opportunity.closeDate,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    owner: opportunity.ownerId
      ? {
          id: opportunity.ownerId,
          name: nameFromDisplayName(opportunity.ownerName),
        }
      : null,
    company: opportunity.companyId
      ? { id: opportunity.companyId, name: opportunity.companyName }
      : null,
    pointOfContact: opportunity.pointOfContactId
      ? {
          id: opportunity.pointOfContactId,
          name: nameFromDisplayName(opportunity.pointOfContactName),
        }
      : null,
  }) as TeamOpportunityRecord;

const meetingFromSnapshot = (
  meeting: TeamWorkspaceSnapshotMeeting,
): TeamCalendarEventRecord =>
  ({
    __typename: 'CalendarEvent',
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    isCanceled: meeting.isCanceled,
    isFullDay: meeting.isFullDay,
    conferenceLink: meeting.conferenceUrl
      ? { primaryLinkLabel: null, primaryLinkUrl: meeting.conferenceUrl }
      : null,
    calendarEventParticipants: meeting.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName,
      handle: null,
      isOrganizer: participant.isOrganizer,
      responseStatus: participant.responseStatus,
      person: participant.personId
        ? {
            id: participant.personId,
            client: participant.clientScope,
            name: nameFromDisplayName(participant.personName),
            company: participant.companyName
              ? {
                  id: `meeting-participant-company:${participant.id}`,
                  name: participant.companyName,
                }
              : null,
          }
        : null,
      workspaceMember: participant.workspaceMemberId
        ? {
            id: participant.workspaceMemberId,
            name: nameFromDisplayName(participant.workspaceMemberName),
          }
        : null,
    })),
  }) as TeamCalendarEventRecord;

const transcriptStatusFromSnapshot = (
  status: TeamWorkspaceSnapshotCallRecording['transcriptStatus'],
): TeamCallRecordingRecord['transcriptStatus'] => {
  switch (status) {
    case 'AVAILABLE':
      return 'available';
    case 'PROCESSING':
      return 'processing';
    case 'MISSING':
      return 'missing';
  }
};

const callRecordingFromSnapshot = (
  recording: TeamWorkspaceSnapshotCallRecording,
): TeamCallRecordingRecord =>
  ({
    __typename: 'CallRecording',
    id: recording.id,
    title: recording.title,
    status: recording.status,
    startedAt: recording.startedAt,
    endedAt: recording.endedAt,
    createdAt: recording.createdAt,
    summary: recording.summaryMarkdown
      ? { markdown: recording.summaryMarkdown }
      : null,
    transcriptStatus: transcriptStatusFromSnapshot(recording.transcriptStatus),
    evidenceReference: recording.evidenceReference,
    calendarEventId: recording.calendarEventId,
  }) as TeamCallRecordingRecord;

export const teamWorkspaceRecordsFromSnapshot = (
  snapshot: TeamWorkspaceSnapshot | null | undefined,
): TeamWorkspaceRecords => {
  if (!snapshot) {
    return {
      tasks: [],
      handoffs: [],
      opportunities: [],
      clients: [],
      meetings: [],
      callRecordings: [],
    };
  }

  return {
    tasks: snapshot.tasks.map(taskFromSnapshot),
    handoffs: snapshot.handoffs.map(taskFromSnapshot),
    opportunities: snapshot.opportunities.map(opportunityFromSnapshot),
    clients: snapshot.clients.map(
      (client) =>
        ({
          __typename: 'Client',
          id: client.id,
          name: client.name,
          slug: client.slug,
          client: client.clientScope,
          status: client.status,
        }) as TeamWorkspaceRecords['clients'][number],
    ),
    meetings: snapshot.meetings.map(meetingFromSnapshot),
    callRecordings: snapshot.callRecordings.map(callRecordingFromSnapshot),
  };
};
