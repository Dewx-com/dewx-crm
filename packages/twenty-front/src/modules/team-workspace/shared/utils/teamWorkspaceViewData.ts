import { nameOfScope } from '@/client-workspace/hooks/useClientWorkspace';
import {
  type OperationsClient,
  type OperationsClientStatus,
  type OperationsHealth,
  type OperationsTask,
  type OperationsTaskStatus,
  type OperationsWorkspaceData,
} from '@/team-workspace/operations';
import {
  type SalesMeeting,
  type SalesMeetingKind,
  type SalesOpportunityStage,
  type SalesTranscriptStatus,
  type SalesWorkspaceData,
} from '@/team-workspace/sales';
import { TEAM_RECORD_PREFIX } from '@/team-workspace/shared/constants/teamWorkspaceRecordConventions';
import {
  type TeamCalendarEventRecord,
  type TeamClientRecord,
  type TeamOpportunityRecord,
  type TeamTaskRecord,
  type TeamWorkspaceRecords,
} from '@/team-workspace/shared/types/TeamWorkspaceRecord';
import {
  clientNameMapOf,
  clientOfMeeting,
  compactText,
  companyOfMeeting,
  contactOfMeeting,
  fullName,
  hasRecordPrefix,
  isDoneTask,
  isOverdueTask,
  outcomeTaskOfMeeting,
  prepTaskOfMeeting,
  recordingOfMeeting,
  recentMeetingsOf,
} from '@/team-workspace/shared/utils/teamWorkspaceRecordModel';

const DAY_IN_MILLISECONDS = 86_400_000;

const META_TASK_PREFIXES = [
  TEAM_RECORD_PREFIX.meetingPrep,
  TEAM_RECORD_PREFIX.meetingOutcome,
  TEAM_RECORD_PREFIX.coaching,
  TEAM_RECORD_PREFIX.handoff,
  TEAM_RECORD_PREFIX.handoffReturn,
  TEAM_RECORD_PREFIX.clientUpdate,
  TEAM_RECORD_PREFIX.completionEvidence,
];

const safeTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const textAfterPrefix = (value: string | null, prefix: string): string => {
  const text = compactText(value);
  return text.toLowerCase().startsWith(prefix.toLowerCase())
    ? compactText(text.slice(prefix.length))
    : text;
};

const protocolDetail = (value: string, scopeOrId?: string | null): string => {
  const parts = value.split('·').map(compactText).filter(Boolean);

  if (scopeOrId && parts[0]?.toLowerCase() === scopeOrId.toLowerCase()) {
    parts.shift();
  }

  return parts.join(' · ');
};

const protocolTail = (value: string): string => {
  const parts = value.split('·').map(compactText).filter(Boolean);
  return (parts.length > 1 ? parts.slice(1) : parts).join(' · ');
};

const protocolMarkdownField = (
  task: TeamTaskRecord | null | undefined,
  label: string,
): string => {
  const markdown = task?.bodyV2?.markdown ?? '';
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(
    new RegExp(
      `\\*\\*${escapedLabel}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\n\\s*\\*\\*[^\\n*]+:\\*\\*|$)`,
      'i',
    ),
  );

  return compactText(match?.[1]);
};

const creatorName = (task: TeamTaskRecord | null | undefined): string =>
  compactText(task?.createdBy?.name);

const verifiedPreparation = (
  task: TeamTaskRecord | null,
): { summary: string; recordedBy: string } | null => {
  const summary = protocolMarkdownField(task, 'Preparation');
  const recordedBy = creatorName(task);

  return task && isDoneTask(task) && summary && recordedBy
    ? { summary, recordedBy }
    : null;
};

type MeetingResult = 'attended' | 'no-show' | 'rescheduled' | 'cancelled';

const verifiedMeetingOutcome = (
  task: TeamTaskRecord | null,
): { result: MeetingResult; summary: string; recordedBy: string } | null => {
  const result = protocolMarkdownField(task, 'Result').toLowerCase();
  const summary = protocolMarkdownField(task, 'Outcome');
  const recordedBy = creatorName(task);
  const resultByLabel: Record<string, MeetingResult> = {
    attended: 'attended',
    'no-show': 'no-show',
    rescheduled: 'rescheduled',
    cancelled: 'cancelled',
  };
  const normalizedResult = resultByLabel[result];

  return task &&
    isDoneTask(task) &&
    normalizedResult !== undefined &&
    summary &&
    recordedBy
    ? { result: normalizedResult, summary, recordedBy }
    : null;
};

const verifiedClientUpdate = (
  task: TeamTaskRecord,
): {
  summary: string;
  evidence: string;
  recordedAt: string;
  recordedBy: string;
} | null => {
  const summary = protocolMarkdownField(task, 'Verified update');
  const evidence = protocolMarkdownField(task, 'Evidence');
  const recordedAt = task.updatedAt ?? task.createdAt ?? '';
  const recordedBy = creatorName(task);

  return isDoneTask(task) &&
    summary &&
    evidence &&
    safeTimestamp(recordedAt) !== null &&
    recordedBy
    ? { summary, evidence, recordedAt, recordedBy }
    : null;
};

const isMetaTask = (task: TeamTaskRecord): boolean =>
  META_TASK_PREFIXES.some((prefix) => hasRecordPrefix(task, prefix));

const opportunityStage = (stage: string | null): SalesOpportunityStage => {
  const value = compactText(stage).toUpperCase();
  const stages: Record<string, SalesOpportunityStage> = {
    NEW: 'new',
    SCREENING: 'qualified',
    MEETING: 'discovery',
    PROPOSAL: 'proposal',
    DECISION: 'decision',
    CUSTOMER: 'won',
    WON: 'won',
    LOST: 'lost',
    NURTURE: 'nurture',
    DNC: 'dnc',
  };

  return stages[value] ?? 'new';
};

const meetingKind = (meeting: TeamCalendarEventRecord): SalesMeetingKind => {
  const text = compactText(
    `${meeting.title ?? ''} ${meeting.description ?? ''}`,
  ).toLowerCase();

  if (text.includes('proposal')) return 'proposal';
  if (text.includes('follow up') || text.includes('follow-up')) {
    return 'follow-up';
  }
  if (text.includes('qualif') || text.includes('screen')) {
    return 'qualification';
  }
  return 'discovery';
};

const matchingOpportunity = ({
  meeting,
  opportunities,
}: {
  meeting: TeamCalendarEventRecord;
  opportunities: TeamOpportunityRecord[];
}): TeamOpportunityRecord | null => {
  const client = compactText(clientOfMeeting(meeting)).toLowerCase();
  const company = compactText(companyOfMeeting(meeting)).toLowerCase();

  return (
    opportunities.find(
      (opportunity) =>
        (client !== '' &&
          compactText(opportunity.client).toLowerCase() === client) ||
        (company !== '' &&
          compactText(opportunity.company?.name).toLowerCase() === company),
    ) ?? null
  );
};

const salesMeetingOf = ({
  meeting,
  records,
  clientNames,
  now,
  timeZone,
}: {
  meeting: TeamCalendarEventRecord;
  records: TeamWorkspaceRecords;
  clientNames: Map<string, string>;
  now: number;
  timeZone: string;
}): SalesMeeting => {
  const prep = prepTaskOfMeeting(meeting, records.tasks);
  const outcome = outcomeTaskOfMeeting(meeting, records.tasks);
  const preparation = verifiedPreparation(prep);
  const meetingOutcome = verifiedMeetingOutcome(outcome);
  const startsAt = safeTimestamp(meeting.startsAt) ?? now;
  const endsAt = safeTimestamp(meeting.endsAt);
  const client = clientOfMeeting(meeting);
  const opportunity = matchingOpportunity({
    meeting,
    opportunities: records.opportunities,
  });

  const status: SalesMeeting['status'] = meeting.isCanceled
    ? 'cancelled'
    : startsAt >= now
      ? preparation
        ? 'prepared'
        : 'scheduled'
      : (meetingOutcome?.result ?? 'outcome-missing');

  return {
    id: meeting.id,
    contactName: contactOfMeeting(meeting) ?? 'Contact not linked',
    companyName:
      companyOfMeeting(meeting) ??
      (client ? (clientNames.get(client) ?? nameOfScope(client)) : null) ??
      'Company not linked',
    startsAt: meeting.startsAt ?? new Date(now).toISOString(),
    durationMinutes:
      endsAt === null
        ? 0
        : Math.max(0, Math.round((endsAt - startsAt) / 60_000)),
    timezoneLabel: timeZone,
    kind: meetingKind(meeting),
    status,
    preparationStatus: !prep
      ? 'not-started'
      : preparation
        ? 'ready'
        : 'in-progress',
    preparationSummary: preparation?.summary,
    opportunityId: opportunity?.id,
    outcome: meetingOutcome?.summary,
  };
};

const coachingLessonFor = (
  recordingId: string,
  tasks: TeamTaskRecord[],
): string | null => {
  const task = tasks.find(
    (candidate) =>
      hasRecordPrefix(candidate, TEAM_RECORD_PREFIX.coaching) &&
      compactText(candidate.title).includes(recordingId),
  );
  if (!task) return null;

  const recordedImprovement = protocolMarkdownField(task, 'Improvement');

  if (recordedImprovement) return recordedImprovement;

  return protocolDetail(
    textAfterPrefix(task.title, TEAM_RECORD_PREFIX.coaching),
    recordingId,
  );
};

export const buildSalesWorkspaceData = ({
  records,
  salespersonName,
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time',
}: {
  records: TeamWorkspaceRecords;
  salespersonName: string;
  now?: Date;
  timeZone?: string;
}): SalesWorkspaceData => {
  const nowTimestamp = now.getTime();
  const clientNames = clientNameMapOf(records.clients);
  const meetings = records.meetings.map((meeting) =>
    salesMeetingOf({
      meeting,
      records,
      clientNames,
      now: nowTimestamp,
      timeZone,
    }),
  );

  const openWork = records.tasks.filter(
    (task) => !isDoneTask(task) && !isMetaTask(task),
  );

  return {
    salespersonName,
    meetings,
    opportunities: records.opportunities.map((opportunity) => {
      const nextAction = openWork
        .filter(
          (task) => task.client !== null && task.client === opportunity.client,
        )
        .sort((left, right) =>
          (left.dueAt ?? '9999').localeCompare(right.dueAt ?? '9999'),
        )[0];

      return {
        id: opportunity.id,
        contactName:
          fullName(opportunity.pointOfContact?.name) || 'Contact not linked',
        companyName:
          compactText(opportunity.company?.name) ||
          (opportunity.client
            ? (clientNames.get(opportunity.client) ??
              nameOfScope(opportunity.client))
            : 'Company not linked'),
        stage: opportunityStage(opportunity.stage),
        nextAction:
          nextAction !== undefined ? compactText(nextAction.title) : undefined,
        nextActionDueAt: nextAction?.dueAt ?? undefined,
      };
    }),
    followUps: openWork
      .filter((task) => Boolean(task.dueAt))
      .map((task) => {
        const opportunity = records.opportunities.find(
          (candidate) =>
            task.client !== null && candidate.client === task.client,
        );
        return {
          id: task.id,
          title: compactText(task.title) || 'Untitled follow-up',
          detail: task.assignmentDetail?.trim() || null,
          companyName: task.client
            ? (clientNames.get(task.client) ?? nameOfScope(task.client))
            : 'Company not linked',
          dueAt: task.dueAt as string,
          status:
            task.status?.toUpperCase() === 'IN_PROGRESS'
              ? ('in-progress' as const)
              : ('todo' as const),
          opportunityId: opportunity?.id,
        };
      }),
    coachingReviews: recentMeetingsOf(records.meetings, nowTimestamp)
      .slice(0, 20)
      .map((meeting) => {
        const recording = recordingOfMeeting(meeting, records.callRecordings);
        const transcriptStatus: SalesTranscriptStatus =
          recording?.transcriptStatus ?? 'missing';
        const evidenceReference = compactText(recording?.evidenceReference);
        const client = clientOfMeeting(meeting);
        const lesson = recording
          ? coachingLessonFor(recording.id, records.tasks)
          : null;

        return {
          id: recording?.id ?? meeting.id,
          meetingId: meeting.id,
          contactName: contactOfMeeting(meeting) ?? 'Contact not linked',
          companyName:
            companyOfMeeting(meeting) ??
            (client
              ? (clientNames.get(client) ?? nameOfScope(client))
              : null) ??
            'Company not linked',
          occurredAt: meeting.startsAt as string,
          transcriptStatus,
          summary: compactText(recording?.summary?.markdown) || undefined,
          improvement: lesson ? { title: lesson } : undefined,
          evidence: evidenceReference
            ? [
                {
                  id: `${recording?.id ?? meeting.id}-evidence`,
                  timestampLabel: 'Safe evidence reference',
                  observation: evidenceReference,
                },
              ]
            : undefined,
        };
      }),
  };
};

const clientStatus = (value: string | null): OperationsClientStatus => {
  const status = compactText(value).toLowerCase();
  if (status.includes('onboard')) return 'onboarding';
  if (status.includes('active') || status.includes('live')) return 'active';
  if (status.includes('pause') || status.includes('hold')) return 'paused';
  if (status.includes('end') || status.includes('complete')) return 'ended';
  return 'unknown';
};

const taskStatus = (task: TeamTaskRecord): OperationsTaskStatus => {
  const value = compactText(task.status).toUpperCase();
  if (value === 'DONE') return 'done';
  if (hasRecordPrefix(task, TEAM_RECORD_PREFIX.blocker)) return 'blocked';
  if (value === 'IN_PROGRESS') return 'in-progress';
  return 'todo';
};

const evidenceForTask = ({
  task,
  tasks,
}: {
  task: TeamTaskRecord;
  tasks: TeamTaskRecord[];
}): OperationsTask['completionEvidence'] => {
  const evidence = tasks.find(
    (candidate) =>
      hasRecordPrefix(candidate, TEAM_RECORD_PREFIX.completionEvidence) &&
      compactText(candidate.title).includes(task.id),
  );
  if (!evidence) return null;

  const markdown = evidence.bodyV2?.markdown ?? '';
  const recordedEvidence = protocolMarkdownField(
    evidence,
    'Completion evidence',
  );
  const sourceRef = compactText(
    markdown.match(/(?:^|\n)\s*Source:\s*(.+)\s*$/i)?.[1],
  );
  const summary = compactText(
    recordedEvidence.replace(/(?:^|\s)Source:\s*.+$/i, ''),
  );
  const recordedBy = creatorName(evidence);
  const recordedAt = evidence.createdAt ?? evidence.updatedAt ?? '';

  if (
    !isDoneTask(evidence) ||
    !summary ||
    !sourceRef ||
    safeTimestamp(recordedAt) === null ||
    !recordedBy
  ) {
    return null;
  }

  return {
    summary,
    sourceRef,
    recordedAt,
    recordedBy,
  };
};

const operationTaskOf = ({
  task,
  tasks,
  clientIds,
  now,
}: {
  task: TeamTaskRecord;
  tasks: TeamTaskRecord[];
  clientIds: Map<string, string>;
  now: number;
}): OperationsTask => {
  const dueAt = safeTimestamp(task.dueAt);
  const isOverdue = isOverdueTask(task, now);
  const dueSoon = dueAt !== null && dueAt <= now + DAY_IN_MILLISECONDS;
  const blocked = hasRecordPrefix(task, TEAM_RECORD_PREFIX.blocker);
  const promise = hasRecordPrefix(task, TEAM_RECORD_PREFIX.promise);
  const blockerReason = blocked
    ? protocolTail(textAfterPrefix(task.title, TEAM_RECORD_PREFIX.blocker))
    : null;
  const title = blocked
    ? `Blocked: ${blockerReason || 'Reason not recorded'}`
    : promise
      ? textAfterPrefix(task.title, TEAM_RECORD_PREFIX.promise)
      : compactText(task.title);

  return {
    id: task.id,
    title: title || 'Untitled work',
    clientId: task.client ? (clientIds.get(task.client) ?? null) : null,
    clientName: null,
    ownerId: task.assignee?.id ?? null,
    ownerName: fullName(task.assignee?.name) || null,
    status: taskStatus(task),
    priority: isOverdue ? 'urgent' : dueSoon ? 'high' : 'normal',
    dueAt: task.dueAt,
    isClientPromise: promise,
    blockedReason: blocked ? blockerReason || 'Reason not recorded' : null,
    updatedAt: task.updatedAt ?? task.createdAt ?? new Date(0).toISOString(),
    completionEvidence: evidenceForTask({ task, tasks }),
  };
};

const scopeDirectory = (records: TeamWorkspaceRecords) => {
  const recordsByScope = new Map<string, TeamClientRecord>();
  for (const client of records.clients) {
    const scope = compactText(client.client);
    if (scope) recordsByScope.set(scope, client);
  }

  const scopes = new Set(recordsByScope.keys());
  records.tasks.forEach((task) => {
    if (task.client) scopes.add(task.client);
  });
  records.opportunities.forEach((opportunity) => {
    if (opportunity.client) scopes.add(opportunity.client);
  });
  records.meetings.forEach((meeting) => {
    const client = clientOfMeeting(meeting);
    if (client) scopes.add(client);
  });

  const ids = new Map<string, string>();
  scopes.forEach((scope) =>
    ids.set(scope, recordsByScope.get(scope)?.id ?? `scope:${scope}`),
  );

  return { scopes: [...scopes], recordsByScope, ids };
};

const healthForClient = ({
  scope,
  status,
  tasks,
  now,
}: {
  scope: string;
  status: OperationsClientStatus;
  tasks: TeamTaskRecord[];
  now: number;
}): OperationsHealth => {
  if (status === 'unknown' || status === 'paused' || status === 'ended') {
    return 'unknown';
  }

  const clientTasks = tasks.filter((task) => task.client === scope);
  if (
    clientTasks.some(
      (task) =>
        !isDoneTask(task) &&
        (hasRecordPrefix(task, TEAM_RECORD_PREFIX.blocker) ||
          (hasRecordPrefix(task, TEAM_RECORD_PREFIX.promise) &&
            isOverdueTask(task, now))),
    )
  ) {
    return 'at-risk';
  }

  const update = clientTasks
    .filter(
      (task) =>
        hasRecordPrefix(task, TEAM_RECORD_PREFIX.clientUpdate) &&
        verifiedClientUpdate(task) !== null,
    )
    .sort((left, right) =>
      (right.updatedAt ?? right.createdAt ?? '').localeCompare(
        left.updatedAt ?? left.createdAt ?? '',
      ),
    )[0];
  const updatedAt = safeTimestamp(update?.updatedAt ?? update?.createdAt);

  return updatedAt === null || now - updatedAt >= 7 * DAY_IN_MILLISECONDS
    ? 'watch'
    : 'healthy';
};

export const buildOperationsWorkspaceData = ({
  records,
  viewer,
  now = new Date(),
}: {
  records: TeamWorkspaceRecords;
  viewer: { id: string; name: string };
  now?: Date;
}): OperationsWorkspaceData => {
  const timestamp = now.getTime();
  const directory = scopeDirectory(records);
  const clientNames = clientNameMapOf(records.clients);
  const clients: OperationsClient[] = directory.scopes.map((scope) => {
    const record = directory.recordsByScope.get(scope);
    const status = clientStatus(record?.status ?? null);
    return {
      id: directory.ids.get(scope) as string,
      name:
        compactText(record?.name) ||
        clientNames.get(scope) ||
        nameOfScope(scope),
      status,
      health: healthForClient({
        scope,
        status,
        tasks: records.tasks,
        now: timestamp,
      }),
      ownerName: null,
    };
  });
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const operationTasks = records.tasks
    .filter((task) => !isMetaTask(task))
    .map((task) =>
      operationTaskOf({
        task,
        tasks: records.tasks,
        clientIds: directory.ids,
        now: timestamp,
      }),
    )
    .map((task) => ({
      ...task,
      clientName: task.clientId
        ? (clientsById.get(task.clientId)?.name ?? null)
        : null,
    }));

  return {
    viewer,
    clients,
    tasks: operationTasks,
    meetings: records.meetings.flatMap((meeting) => {
      const scope = clientOfMeeting(meeting);
      if (!scope) return [];
      const clientId = directory.ids.get(scope);
      if (!clientId) return [];
      const prep = prepTaskOfMeeting(meeting, records.tasks);
      const outcome = outcomeTaskOfMeeting(meeting, records.tasks);
      const preparation = verifiedPreparation(prep);
      const meetingOutcome = verifiedMeetingOutcome(outcome);
      const startsAt = safeTimestamp(meeting.startsAt);
      const owner = (meeting.calendarEventParticipants ?? []).find(
        (participant) => participant.workspaceMember,
      )?.workspaceMember;

      return [
        {
          id: meeting.id,
          clientId,
          clientName: clientsById.get(clientId)?.name ?? nameOfScope(scope),
          title: compactText(meeting.title) || 'Untitled meeting',
          startsAt: meeting.startsAt ?? new Date(0).toISOString(),
          endsAt: meeting.endsAt,
          ownerName: fullName(owner?.name) || null,
          participants: (meeting.calendarEventParticipants ?? [])
            .map(
              (participant) =>
                compactText(participant.displayName) ||
                fullName(participant.person?.name) ||
                fullName(participant.workspaceMember?.name) ||
                compactText(participant.handle),
            )
            .filter(Boolean),
          purpose: compactText(meeting.description) || null,
          prepStatus: !prep
            ? ('not-started' as const)
            : preparation
              ? ('ready' as const)
              : ('in-progress' as const),
          prepSummary: preparation?.summary ?? null,
          previousMeetingSummary: meetingOutcome?.summary ?? null,
          joinUrl: meeting.conferenceLink?.primaryLinkUrl ?? null,
          status: meeting.isCanceled
            ? ('cancelled' as const)
            : startsAt === null || startsAt >= timestamp
              ? ('scheduled' as const)
              : meetingOutcome
                ? meetingOutcome.result === 'attended'
                  ? ('completed' as const)
                  : meetingOutcome.result
                : ('outcome-missing' as const),
        },
      ];
    }),
    updates: records.tasks
      .filter((task) => hasRecordPrefix(task, TEAM_RECORD_PREFIX.clientUpdate))
      .flatMap((task) => {
        if (!task.client) return [];
        const clientId = directory.ids.get(task.client);
        if (!clientId) return [];
        const verifiedUpdate = verifiedClientUpdate(task);
        return [
          {
            id: task.id,
            clientId,
            clientName:
              clientsById.get(clientId)?.name ?? nameOfScope(task.client),
            summary:
              verifiedUpdate?.summary ??
              (protocolDetail(
                textAfterPrefix(task.title, TEAM_RECORD_PREFIX.clientUpdate),
                task.client,
              ) ||
                'Update recorded'),
            status: verifiedUpdate ? ('verified' as const) : ('draft' as const),
            occurredAt: task.createdAt ?? new Date(0).toISOString(),
            verifiedAt: verifiedUpdate?.recordedAt ?? null,
            verifiedBy: verifiedUpdate?.recordedBy ?? null,
            evidenceRef: verifiedUpdate?.evidence ?? null,
          },
        ];
      }),
    handoffs: records.handoffs.map((handoff) => {
      const returned = records.tasks.some(
        (task) =>
          hasRecordPrefix(task, TEAM_RECORD_PREFIX.handoffReturn) &&
          compactText(task.title).includes(handoff.id),
      );
      const clientId = handoff.client
        ? (directory.ids.get(handoff.client) ?? null)
        : null;
      return {
        id: handoff.id,
        title:
          protocolTail(
            textAfterPrefix(handoff.title, TEAM_RECORD_PREFIX.handoff),
          ) || 'Sales handoff',
        clientId,
        clientName: clientId ? (clientsById.get(clientId)?.name ?? null) : null,
        fromName:
          creatorName(handoff) ||
          fullName(handoff.assignee?.name) ||
          'Sales actor not recorded',
        toUserId: viewer.id,
        toName: viewer.name,
        context: compactText(handoff.bodyV2?.markdown) || null,
        createdAt: handoff.createdAt ?? new Date(0).toISOString(),
        dueAt: handoff.dueAt,
        status: returned
          ? ('returned' as const)
          : isDoneTask(handoff)
            ? ('accepted' as const)
            : ('pending' as const),
      };
    }),
  };
};

export const clientScopeFromWorkspaceId = ({
  clientId,
  clients,
}: {
  clientId: string;
  clients: TeamClientRecord[];
}): string | null => {
  const record = clients.find((client) => client.id === clientId);
  if (record?.client) return record.client;
  return clientId.startsWith('scope:') ? clientId.slice('scope:'.length) : null;
};
