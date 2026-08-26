import {
  type OperationsClient,
  type OperationsClientUpdate,
  type OperationsHandoff,
  type OperationsMeeting,
  type OperationsTask,
  type OperationsTaskStatus,
  type OperationsWorkspaceData,
} from '@/team-workspace/operations/operations-workspace-types';

export const VERIFIED_UPDATE_MAX_AGE_DAYS = 7;

const DAY_IN_MILLISECONDS = 86_400_000;

const PRIORITY_WEIGHT: Record<OperationsTask['priority'], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const safeTime = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const dueTime = (task: OperationsTask): number =>
  safeTime(task.dueAt) ?? Number.POSITIVE_INFINITY;

export const isOpenTask = (task: OperationsTask): boolean =>
  task.status !== 'done';

export const isTaskOverdue = (
  task: OperationsTask,
  now: Date = new Date(),
): boolean => {
  const timestamp = safeTime(task.dueAt);
  return isOpenTask(task) && timestamp !== null && timestamp < now.getTime();
};

export const canMarkTaskDone = (task: OperationsTask): boolean => {
  const evidence = task.completionEvidence;
  return Boolean(
    evidence?.summary.trim() &&
    evidence.sourceRef.trim() &&
    safeTime(evidence.recordedAt) !== null &&
    evidence.recordedBy.trim(),
  );
};

export const compareTasks = (
  left: OperationsTask,
  right: OperationsTask,
): number =>
  PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority] ||
  dueTime(left) - dueTime(right) ||
  left.title.localeCompare(right.title);

export const groupTasksByStatus = (
  tasks: OperationsTask[],
): Record<OperationsTaskStatus, OperationsTask[]> => ({
  todo: tasks.filter((task) => task.status === 'todo').sort(compareTasks),
  'in-progress': tasks
    .filter((task) => task.status === 'in-progress')
    .sort(compareTasks),
  blocked: tasks.filter((task) => task.status === 'blocked').sort(compareTasks),
  done: tasks
    .filter((task) => task.status === 'done')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
});

export const isVerifiedUpdate = (update: OperationsClientUpdate): boolean =>
  update.status === 'verified' &&
  safeTime(update.verifiedAt) !== null &&
  Boolean(update.verifiedBy?.trim() && update.evidenceRef?.trim());

export const latestVerifiedUpdateByClient = (
  updates: OperationsClientUpdate[],
): Map<string, OperationsClientUpdate> => {
  const latest = new Map<string, OperationsClientUpdate>();

  for (const update of updates.filter(isVerifiedUpdate)) {
    const current = latest.get(update.clientId);
    if (!current || (update.verifiedAt ?? '') > (current.verifiedAt ?? '')) {
      latest.set(update.clientId, update);
    }
  }

  return latest;
};

export type OperationsClientRow = OperationsClient & {
  nextAction: OperationsTask | null;
  lastVerifiedUpdate: OperationsClientUpdate | null;
};

export const buildClientRows = (
  data: Pick<OperationsWorkspaceData, 'clients' | 'tasks' | 'updates'>,
): OperationsClientRow[] => {
  const latestUpdates = latestVerifiedUpdateByClient(data.updates);

  return data.clients
    .map((client) => ({
      ...client,
      nextAction:
        data.tasks
          .filter((task) => task.clientId === client.id && isOpenTask(task))
          .sort(compareTasks)[0] ?? null,
      lastVerifiedUpdate: latestUpdates.get(client.id) ?? null,
    }))
    .sort((left, right) => {
      const healthDifference =
        healthWeight(left.health) - healthWeight(right.health);
      if (healthDifference !== 0) return healthDifference;

      if (left.nextAction !== null && right.nextAction !== null) {
        const taskDifference = compareTasks(left.nextAction, right.nextAction);
        if (taskDifference !== 0) return taskDifference;
      } else if (left.nextAction !== null) {
        return -1;
      } else if (right.nextAction !== null) {
        return 1;
      }

      return left.name.localeCompare(right.name);
    });
};

const healthWeight = (health: OperationsClient['health']): number =>
  ({ 'at-risk': 0, watch: 1, unknown: 2, healthy: 3 })[health];

export type ClientNeedingUpdate = {
  client: OperationsClient;
  lastVerifiedUpdate: OperationsClientUpdate | null;
  ageDays: number | null;
};

export const clientsNeedingVerifiedUpdate = (
  data: Pick<OperationsWorkspaceData, 'clients' | 'updates'>,
  now: Date = new Date(),
): ClientNeedingUpdate[] => {
  const latest = latestVerifiedUpdateByClient(data.updates);

  return data.clients
    .filter(
      (client) => client.status === 'active' || client.status === 'onboarding',
    )
    .flatMap((client) => {
      const update = latest.get(client.id) ?? null;
      const verifiedAt = safeTime(update?.verifiedAt);
      const ageDays =
        verifiedAt === null
          ? null
          : Math.max(
              0,
              Math.floor((now.getTime() - verifiedAt) / DAY_IN_MILLISECONDS),
            );

      return ageDays === null || ageDays >= VERIFIED_UPDATE_MAX_AGE_DAYS
        ? [{ client, lastVerifiedUpdate: update, ageDays }]
        : [];
    })
    .sort(
      (left, right) =>
        Number(left.ageDays !== null) - Number(right.ageDays !== null) ||
        (right.ageDays ?? 0) - (left.ageDays ?? 0) ||
        left.client.name.localeCompare(right.client.name),
    );
};

export const upcomingMeetings = (
  meetings: OperationsMeeting[],
  now: Date = new Date(),
): OperationsMeeting[] =>
  meetings
    .filter(
      (meeting) =>
        meeting.status === 'scheduled' &&
        (safeTime(meeting.startsAt) ?? Number.NEGATIVE_INFINITY) >=
          now.getTime(),
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

export const recentMeetings = (
  meetings: OperationsMeeting[],
  now: Date = new Date(),
): OperationsMeeting[] =>
  meetings
    .filter(
      (meeting) =>
        meeting.status !== 'scheduled' &&
        (safeTime(meeting.startsAt) ?? Number.POSITIVE_INFINITY) <
          now.getTime(),
    )
    .sort((left, right) => right.startsAt.localeCompare(left.startsAt));

export const pendingHandoffsForViewer = (
  handoffs: OperationsHandoff[],
  viewerId: string,
): OperationsHandoff[] =>
  handoffs
    .filter(
      (handoff) =>
        handoff.status === 'pending' && handoff.toUserId === viewerId,
    )
    .sort(
      (left, right) =>
        (safeTime(left.dueAt) ?? Number.POSITIVE_INFINITY) -
          (safeTime(right.dueAt) ?? Number.POSITIVE_INFINITY) ||
        left.createdAt.localeCompare(right.createdAt),
    );

export type OperationsTodayModel = {
  urgentActions: OperationsTask[];
  overduePromises: OperationsTask[];
  blockedWork: OperationsTask[];
  nextMeeting: OperationsMeeting | null;
  clientsNeedingUpdate: ClientNeedingUpdate[];
  pendingHandoffs: OperationsHandoff[];
};

export const buildOperationsToday = (
  data: OperationsWorkspaceData,
  now: Date = new Date(),
): OperationsTodayModel => {
  const openTasks = data.tasks.filter(isOpenTask);

  return {
    urgentActions: openTasks
      .filter(
        (task) =>
          task.priority === 'urgent' ||
          task.priority === 'high' ||
          isTaskOverdue(task, now),
      )
      .sort((left, right) => {
        const overdueDifference =
          Number(isTaskOverdue(right, now)) - Number(isTaskOverdue(left, now));
        return overdueDifference || compareTasks(left, right);
      }),
    overduePromises: openTasks
      .filter((task) => task.isClientPromise && isTaskOverdue(task, now))
      .sort(compareTasks),
    blockedWork: openTasks
      .filter((task) => task.status === 'blocked')
      .sort(compareTasks),
    nextMeeting: upcomingMeetings(data.meetings, now)[0] ?? null,
    clientsNeedingUpdate: clientsNeedingVerifiedUpdate(data, now),
    pendingHandoffs: pendingHandoffsForViewer(data.handoffs, data.viewer.id),
  };
};

export const dueLabel = (
  value: string | null,
  now: Date = new Date(),
): string => {
  const timestamp = safeTime(value);
  if (timestamp === null) return 'No due date';

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDueDay = new Date(timestamp);
  startOfDueDay.setHours(0, 0, 0, 0);
  const difference = Math.round(
    (startOfDueDay.getTime() - startOfToday.getTime()) / DAY_IN_MILLISECONDS,
  );

  if (difference < -1) return `${Math.abs(difference)} days overdue`;
  if (difference === -1) return '1 day overdue';
  if (difference === 0) return 'Due today';
  if (difference === 1) return 'Due tomorrow';
  return `Due in ${difference} days`;
};

export const formatDateTime = (value: string): string => {
  const timestamp = safeTime(value);
  if (timestamp === null) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
};
