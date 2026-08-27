import { nameOfScope } from '@/client-workspace/hooks/useClientWorkspace';
import { type TeamManagementMember } from '@/team-workspace/shared/graphql/queries/getTeamManagementSnapshot';
import {
  type TeamTaskRecord,
  type TeamWorkspaceRecords,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';
import {
  clientNameMapOf,
  clientOfMeeting,
  compactText,
  companyOfMeeting,
  hasRecordPrefix,
  isDoneTask,
} from '@/team-workspace/shared/utils/teamWorkspaceRecordModel';
import { buildSalesWorkspaceData } from '@/team-workspace/shared/utils/teamWorkspaceViewData';
import { TEAM_RECORD_PREFIX } from '@/team-workspace/shared/constants/teamWorkspaceRecordConventions';

const META_TASK_PREFIXES = [
  TEAM_RECORD_PREFIX.meetingPrep,
  TEAM_RECORD_PREFIX.meetingOutcome,
  TEAM_RECORD_PREFIX.coaching,
  TEAM_RECORD_PREFIX.handoff,
  TEAM_RECORD_PREFIX.handoffReturn,
  TEAM_RECORD_PREFIX.clientUpdate,
  TEAM_RECORD_PREFIX.completionEvidence,
];

export type TeamManagementLane = 'sales' | 'operations';

export type TeamManagementTask = {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  dueAt: string | null;
  clientName: string | null;
  isOverdue: boolean;
  isBlocked: boolean;
  isClientPromise: boolean;
  hasCompletionEvidence: boolean;
};

export type TeamManagementEmployee = {
  id: string;
  name: string;
  lane: TeamManagementLane;
  attention: 'clear' | 'needs-attention';
  counts: {
    assigned: number;
    open: number;
    done: number;
    evidenceGaps: number;
    overdue: number;
    blockers: number;
    promises: number;
  };
  tasks: TeamManagementTask[];
  nextFollowUp: TeamManagementTask | null;
  nextMeeting: {
    id: string;
    title: string;
    startsAt: string;
    clientName: string | null;
  } | null;
  latestEvidence: {
    taskId: string;
    summary: string;
    source: string;
    recordedAt: string | null;
  } | null;
  coachingNote: {
    title: string;
    detail: string | null;
    evidenceReference: string | null;
  } | null;
};

export type TeamManagementModel = {
  generatedAt: string;
  employees: TeamManagementEmployee[];
  unassignedSales: TeamManagementTask[];
  unassignedOperations: TeamManagementTask[];
};

const laneOf = (lane: TeamManagementMember['lane']): TeamManagementLane =>
  lane === 'SALES' ? 'sales' : 'operations';

const isMetaTask = (task: TeamTaskRecord): boolean =>
  META_TASK_PREFIXES.some((prefix) => hasRecordPrefix(task, prefix));

const safeTime = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
};

const evidenceTaskFor = (
  task: TeamTaskRecord,
  tasks: TeamTaskRecord[],
): TeamTaskRecord | null =>
  tasks.find((candidate) => {
    if (!hasRecordPrefix(candidate, TEAM_RECORD_PREFIX.completionEvidence)) {
      return false;
    }

    const referencedTaskId = compactText(candidate.title).split('·')[1]?.trim();

    return referencedTaskId === task.id;
  }) ?? null;

const markdownField = (markdown: string, label: string): string => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(
    new RegExp(
      `\\*\\*${escapedLabel}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\n(?:\\*\\*|Source:)|$)`,
      'i',
    ),
  );

  return compactText(match?.[1]);
};

const evidenceOf = (
  task: TeamTaskRecord,
  tasks: TeamTaskRecord[],
): TeamManagementEmployee['latestEvidence'] => {
  const evidenceTask = evidenceTaskFor(task, tasks);
  const markdown = evidenceTask?.bodyV2?.markdown ?? '';
  const summary = markdownField(markdown, 'Completion evidence');
  const source = compactText(
    markdown.match(/(?:^|\n)\s*Source:\s*(.+)\s*$/i)?.[1],
  );

  if (!evidenceTask || !isDoneTask(evidenceTask) || !summary || !source) {
    return null;
  }

  return {
    taskId: task.id,
    summary,
    source,
    recordedAt: evidenceTask.createdAt ?? evidenceTask.updatedAt,
  };
};

const taskClientName = (
  task: TeamTaskRecord,
  records: TeamWorkspaceRecords,
): string | null => {
  if (!task.client) return null;
  const names = clientNameMapOf(records.clients);

  return names.get(task.client) ?? nameOfScope(task.client);
};

const managementTaskOf = ({
  task,
  records,
  now,
}: {
  task: TeamTaskRecord;
  records: TeamWorkspaceRecords;
  now: number;
}): TeamManagementTask => {
  const evidence = evidenceOf(task, records.tasks);
  const dueAt = safeTime(task.dueAt);

  return {
    id: task.id,
    title: compactText(task.title) || 'Untitled work',
    detail: task.assignmentDetail?.trim() || null,
    status: compactText(task.status).toUpperCase() || 'UNKNOWN',
    dueAt: task.dueAt,
    clientName: taskClientName(task, records),
    isOverdue: !isDoneTask(task) && dueAt !== null && dueAt < now,
    isBlocked: hasRecordPrefix(task, TEAM_RECORD_PREFIX.blocker),
    isClientPromise: hasRecordPrefix(task, TEAM_RECORD_PREFIX.promise),
    hasCompletionEvidence: evidence !== null,
  };
};

const nextMeetingFor = ({
  member,
  records,
  now,
}: {
  member: TeamManagementMember;
  records: TeamWorkspaceRecords;
  now: number;
}): TeamManagementEmployee['nextMeeting'] => {
  const clientNames = clientNameMapOf(records.clients);
  const meeting = records.meetings
    .filter((candidate) => {
      const startsAt = safeTime(candidate.startsAt);

      return (
        !candidate.isCanceled &&
        startsAt !== null &&
        startsAt >= now &&
        (candidate.calendarEventParticipants ?? []).some(
          (participant) => participant.workspaceMember?.id === member.id,
        )
      );
    })
    .sort((left, right) =>
      (left.startsAt ?? '').localeCompare(right.startsAt ?? ''),
    )[0];

  if (!meeting?.startsAt) return null;
  const scope = clientOfMeeting(meeting);

  return {
    id: meeting.id,
    title: compactText(meeting.title) || 'Untitled meeting',
    startsAt: meeting.startsAt,
    clientName:
      companyOfMeeting(meeting) ??
      (scope ? (clientNames.get(scope) ?? nameOfScope(scope)) : null),
  };
};

const coachingNoteFor = ({
  member,
  records,
  now,
}: {
  member: TeamManagementMember;
  records: TeamWorkspaceRecords;
  now: Date;
}): TeamManagementEmployee['coachingNote'] => {
  if (member.lane !== 'SALES') return null;

  const ownedMeetingIds = new Set(
    records.meetings
      .filter((meeting) =>
        (meeting.calendarEventParticipants ?? []).some(
          (participant) => participant.workspaceMember?.id === member.id,
        ),
      )
      .map((meeting) => meeting.id),
  );
  const review = buildSalesWorkspaceData({
    records,
    salespersonName: member.name ?? 'Sales team member',
    now,
  }).coachingReviews.find((candidate) =>
    ownedMeetingIds.has(candidate.meetingId),
  );

  if (!review || review.transcriptStatus !== 'available') return null;

  return {
    title:
      review.improvement?.title ??
      review.summary ??
      'Call evidence is available for review.',
    detail: review.improvement?.detail ?? review.summary ?? null,
    evidenceReference: review.evidence?.[0]?.observation ?? null,
  };
};

export const buildTeamManagementModel = ({
  generatedAt,
  members,
  salesRecords,
  operationsRecords,
  now = new Date(),
}: {
  generatedAt: string;
  members: TeamManagementMember[];
  salesRecords: TeamWorkspaceRecords;
  operationsRecords: TeamWorkspaceRecords;
  now?: Date;
}): TeamManagementModel => {
  const nowTimestamp = now.getTime();
  const employees = members.map((member): TeamManagementEmployee => {
    const lane = laneOf(member.lane);
    const records = lane === 'sales' ? salesRecords : operationsRecords;
    const ownedTasks = records.tasks.filter(
      (task) => task.assignee?.id === member.id && !isMetaTask(task),
    );
    const tasks = ownedTasks
      .map((task) => managementTaskOf({ task, records, now: nowTimestamp }))
      .sort((left, right) => {
        if (left.isOverdue !== right.isOverdue) {
          return Number(right.isOverdue) - Number(left.isOverdue);
        }

        return (left.dueAt ?? '9999').localeCompare(right.dueAt ?? '9999');
      });
    const doneTasks = tasks.filter((task) => task.status === 'DONE');
    const openTasks = tasks.filter((task) => task.status !== 'DONE');
    const overdue = openTasks.filter((task) => task.isOverdue).length;
    const blockers = openTasks.filter((task) => task.isBlocked).length;
    const evidenceGaps = doneTasks.filter(
      (task) => !task.hasCompletionEvidence,
    ).length;
    const nextFollowUp =
      openTasks
        .filter((task) => task.dueAt !== null)
        .sort((left, right) =>
          (left.dueAt ?? '').localeCompare(right.dueAt ?? ''),
        )[0] ?? null;
    const latestEvidence =
      ownedTasks
        .flatMap((task) => {
          const evidence = evidenceOf(task, records.tasks);

          return evidence ? [evidence] : [];
        })
        .sort((left, right) =>
          (right.recordedAt ?? '').localeCompare(left.recordedAt ?? ''),
        )[0] ?? null;

    return {
      id: member.id,
      name:
        compactText(member.name) ||
        `${lane === 'sales' ? 'Sales' : 'Operations'} team member`,
      lane,
      attention:
        overdue > 0 || blockers > 0 || evidenceGaps > 0
          ? 'needs-attention'
          : 'clear',
      counts: {
        assigned: tasks.length,
        open: openTasks.length,
        done: doneTasks.length,
        evidenceGaps,
        overdue,
        blockers,
        promises: openTasks.filter((task) => task.isClientPromise).length,
      },
      tasks,
      nextFollowUp,
      nextMeeting: nextMeetingFor({
        member,
        records,
        now: nowTimestamp,
      }),
      latestEvidence,
      coachingNote: coachingNoteFor({ member, records, now }),
    };
  });
  const assignedSalesIds = new Set(
    members
      .filter((member) => member.lane === 'SALES')
      .map((member) => member.id),
  );
  const assignedOperationsIds = new Set(
    members
      .filter((member) => member.lane === 'OPERATIONS')
      .map((member) => member.id),
  );
  const unassignedSales = salesRecords.tasks
    .filter(
      (task) =>
        !isMetaTask(task) &&
        !isDoneTask(task) &&
        (!task.assignee || !assignedSalesIds.has(task.assignee.id)),
    )
    .map((task) =>
      managementTaskOf({ task, records: salesRecords, now: nowTimestamp }),
    );
  const unassignedOperations = operationsRecords.tasks
    .filter(
      (task) =>
        !isMetaTask(task) &&
        !isDoneTask(task) &&
        (!task.assignee || !assignedOperationsIds.has(task.assignee.id)),
    )
    .map((task) =>
      managementTaskOf({ task, records: operationsRecords, now: nowTimestamp }),
    );

  return { generatedAt, employees, unassignedSales, unassignedOperations };
};
