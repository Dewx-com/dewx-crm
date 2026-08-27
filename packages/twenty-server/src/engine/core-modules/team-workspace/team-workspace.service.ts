import { ForbiddenException, Injectable } from '@nestjs/common';

import { ILike, In, IsNull, type FindOptionsWhere } from 'typeorm';

import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import {
  baseRoleLabel,
  TEAM_WORKSPACE_QUERY_LIMIT,
  TEAM_WORKSPACE_RECORD_PREFIX,
  TEAM_WORKSPACE_ROLE_LABEL,
} from 'src/engine/core-modules/team-workspace/team-workspace.constants';
import {
  type TeamWorkspaceCallRecordingDTO,
  type TeamWorkspaceClientDTO,
  type TeamWorkspaceMeetingDTO,
  type TeamWorkspaceMeetingParticipantDTO,
  type TeamWorkspaceOpportunityDTO,
  type TeamWorkspaceSnapshotDTO,
  type TeamWorkspaceTaskDTO,
  TeamWorkspaceTranscriptStatus,
} from 'src/engine/core-modules/team-workspace/dtos/team-workspace-snapshot.dto';
import {
  type TeamManagementMemberDTO,
  type TeamManagementSnapshotDTO,
} from 'src/engine/core-modules/team-workspace/dtos/team-management-snapshot.dto';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { RoleService } from 'src/engine/metadata-modules/role/role.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';

type FullName = {
  firstName?: string | null;
  lastName?: string | null;
};

type NamedEntity = {
  id: string;
  name: FullName | null;
  nameFirstName?: string | null;
  nameLastName?: string | null;
};

type LaneWorkspaceMember = NamedEntity;

type Actor = {
  workspaceMemberId?: string | null;
  name?: string | null;
};

type TeamTaskEntity = {
  id: string;
  title: string | null;
  bodyV2?: { markdown?: string | null } | null;
  status: string | null;
  workType: string | null;
  client: string | null;
  dueAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  assigneeId: string | null;
  assignee: NamedEntity | null;
  createdBy: Actor | null;
  bodyV2Markdown?: string | null;
  createdByWorkspaceMemberId?: string | null;
  createdByName?: string | null;
  assignmentDetail?: string | null;
};

type TeamOpportunityEntity = {
  id: string;
  name: string | null;
  stage: string | null;
  client: string | null;
  closeDate: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  ownerId: string | null;
  owner: NamedEntity | null;
  company: { id: string; name: string | null } | null;
  pointOfContact: NamedEntity | null;
};

type TeamClientEntity = {
  id: string;
  name: string | null;
  slug: string | null;
  client: string | null;
  status: string | null;
};

type TeamMeetingParticipantEntity = {
  id: string;
  displayName: string | null;
  isOrganizer: boolean | null;
  responseStatus: string | null;
  person: {
    id: string;
    name: FullName | null;
    nameFirstName?: string | null;
    nameLastName?: string | null;
    client: string | null;
    company: { id: string; name: string | null } | null;
  } | null;
  workspaceMember: NamedEntity | null;
  workspaceMemberId: string | null;
};

type TeamMeetingEntity = {
  id: string;
  title: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isCanceled: boolean | null;
  isFullDay: boolean | null;
  conferenceLink: { primaryLinkUrl?: string | null } | null;
  conferenceLinkPrimaryLinkUrl?: string | null;
  calendarEventParticipants: TeamMeetingParticipantEntity[];
};

type TeamCallRecordingEntity = {
  id: string;
  title: string | null;
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: Date | string | null;
  summary: { markdown?: string | null } | null;
  summaryMarkdown?: string | null;
  transcript?: unknown;
  calendarEventId: string | null;
};

const KNOWN_ROLE_LABELS = new Set<string>(
  Object.values(TEAM_WORKSPACE_ROLE_LABEL),
);

const fullName = (name: FullName | null | undefined): string | null => {
  const value = [name?.firstName, name?.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');

  return value || null;
};

const timestamp = (value: Date | string | null | undefined): string | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const hasTranscriptData = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === 'object' && Object.keys(value).length > 0;
};

const titleStartsWith = (
  task: Pick<TeamTaskEntity, 'title'>,
  prefix: string,
): boolean => task.title?.startsWith(prefix) ?? false;

const isHandoff = (task: Pick<TeamTaskEntity, 'title'>): boolean =>
  titleStartsWith(task, TEAM_WORKSPACE_RECORD_PREFIX.handoff);

const isMemberTask = (
  task: TeamTaskEntity,
  workspaceMemberIds: ReadonlySet<string>,
): boolean =>
  (task.assigneeId !== null && workspaceMemberIds.has(task.assigneeId)) ||
  (task.createdBy?.workspaceMemberId !== null &&
    task.createdBy?.workspaceMemberId !== undefined &&
    workspaceMemberIds.has(task.createdBy.workspaceMemberId));

const isUnassignedActiveSalesTask = (task: TeamTaskEntity): boolean =>
  task.assigneeId === null &&
  task.workType?.toUpperCase() === 'OUTREACH' &&
  ['TODO', 'IN_PROGRESS'].includes(task.status?.toUpperCase() ?? '');

const isOperationsLaneWideTask = (task: TeamTaskEntity): boolean =>
  task.workType?.toUpperCase() === 'SOFTWARE' ||
  titleStartsWith(task, TEAM_WORKSPACE_RECORD_PREFIX.blocker) ||
  titleStartsWith(task, TEAM_WORKSPACE_RECORD_PREFIX.clientUpdate) ||
  titleStartsWith(task, TEAM_WORKSPACE_RECORD_PREFIX.handoff) ||
  titleStartsWith(task, TEAM_WORKSPACE_RECORD_PREFIX.handoffReturn) ||
  titleStartsWith(task, TEAM_WORKSPACE_RECORD_PREFIX.promise);

const canReadTask = ({
  task,
  lane,
  laneMemberIds,
}: {
  task: TeamTaskEntity;
  lane: TeamWorkspaceLane;
  laneMemberIds: string[];
}): boolean => {
  if (lane === TeamWorkspaceLane.SALES) {
    return isMemberTask(task, new Set(laneMemberIds));
  }

  return isOperationsLaneWideTask(task);
};

const referencedTaskId = (
  task: TeamTaskEntity,
  prefix: string,
): string | null => {
  if (!titleStartsWith(task, prefix)) {
    return null;
  }

  return task.title?.slice(prefix.length).split('·')[0].trim() || null;
};

const isDetailTask = (
  task: TeamTaskEntity,
  lane: TeamWorkspaceLane,
): boolean => {
  const sharedDetailPrefixes = [
    TEAM_WORKSPACE_RECORD_PREFIX.completionEvidence,
    TEAM_WORKSPACE_RECORD_PREFIX.meetingOutcome,
    TEAM_WORKSPACE_RECORD_PREFIX.meetingPrep,
  ];

  if (sharedDetailPrefixes.some((prefix) => titleStartsWith(task, prefix))) {
    return true;
  }

  if (lane === TeamWorkspaceLane.SALES) {
    return titleStartsWith(task, TEAM_WORKSPACE_RECORD_PREFIX.coaching);
  }

  return [
    TEAM_WORKSPACE_RECORD_PREFIX.clientUpdate,
    TEAM_WORKSPACE_RECORD_PREFIX.completionEvidence,
    TEAM_WORKSPACE_RECORD_PREFIX.handoff,
  ].some((prefix) => titleStartsWith(task, prefix));
};

const assignmentDetailFromMarkdown = (
  markdown: string | null | undefined,
): string | null => {
  const match = markdown
    ?.replace(/\r\n?/g, '\n')
    .trim()
    .match(
      /^<!-- pe-team-command-receipt-v1:[A-Za-z0-9_-]+ -->\n+\*\*Assignment:\*\*\s*([\s\S]+)$/,
    );
  const detail = match?.[1].trim();

  return detail ? detail : null;
};

const taskDto = (task: TeamTaskEntity): TeamWorkspaceTaskDTO => ({
  id: task.id,
  title: task.title ?? null,
  status: task.status ?? null,
  workType: task.workType ?? null,
  clientScope: task.client ?? null,
  dueAt: timestamp(task.dueAt),
  createdAt: timestamp(task.createdAt),
  updatedAt: timestamp(task.updatedAt),
  assigneeId: task.assigneeId ?? task.assignee?.id ?? null,
  assigneeName: fullName(task.assignee?.name),
  bodyMarkdown: task.bodyV2?.markdown ?? null,
  assignmentDetail: task.assignmentDetail ?? null,
  createdByName: task.bodyV2 ? (task.createdBy?.name ?? null) : null,
});

const opportunityDto = (
  opportunity: TeamOpportunityEntity,
): TeamWorkspaceOpportunityDTO => ({
  id: opportunity.id,
  name: opportunity.name ?? null,
  stage: opportunity.stage ?? null,
  clientScope: opportunity.client ?? null,
  closeDate: timestamp(opportunity.closeDate),
  createdAt: timestamp(opportunity.createdAt),
  updatedAt: timestamp(opportunity.updatedAt),
  ownerId: opportunity.ownerId ?? opportunity.owner?.id ?? null,
  ownerName: fullName(opportunity.owner?.name),
  companyId: opportunity.company?.id ?? null,
  companyName: opportunity.company?.name ?? null,
  pointOfContactId: opportunity.pointOfContact?.id ?? null,
  pointOfContactName: fullName(opportunity.pointOfContact?.name),
});

const clientDto = (client: TeamClientEntity): TeamWorkspaceClientDTO => ({
  id: client.id,
  name: client.name ?? null,
  slug: client.slug ?? null,
  clientScope: client.client ?? null,
  status: client.status ?? null,
});

const participantDto = (
  participant: TeamMeetingParticipantEntity,
): TeamWorkspaceMeetingParticipantDTO => ({
  id: participant.id,
  displayName: participant.displayName ?? null,
  isOrganizer: participant.isOrganizer ?? null,
  responseStatus: participant.responseStatus ?? null,
  personId: participant.person?.id ?? null,
  personName: fullName(participant.person?.name),
  clientScope: participant.person?.client ?? null,
  companyName: participant.person?.company?.name ?? null,
  workspaceMemberId:
    participant.workspaceMemberId ?? participant.workspaceMember?.id ?? null,
  workspaceMemberName: fullName(participant.workspaceMember?.name),
});

const meetingDto = (meeting: TeamMeetingEntity): TeamWorkspaceMeetingDTO => ({
  id: meeting.id,
  title: meeting.title ?? null,
  description: meeting.description ?? null,
  startsAt: timestamp(meeting.startsAt),
  endsAt: timestamp(meeting.endsAt),
  isCanceled: meeting.isCanceled ?? null,
  isFullDay: meeting.isFullDay ?? null,
  conferenceUrl: meeting.conferenceLink?.primaryLinkUrl ?? null,
  participants: (meeting.calendarEventParticipants ?? []).map(participantDto),
});

const callRecordingDto = (
  recording: TeamCallRecordingEntity,
): TeamWorkspaceCallRecordingDTO => {
  const transcriptIsAvailable = hasTranscriptData(recording.transcript);
  const recordingStatus = recording.status?.toLowerCase() ?? '';
  const transcriptStatus = transcriptIsAvailable
    ? TeamWorkspaceTranscriptStatus.AVAILABLE
    : ['pending', 'process', 'request'].some((value) =>
          recordingStatus.includes(value),
        )
      ? TeamWorkspaceTranscriptStatus.PROCESSING
      : TeamWorkspaceTranscriptStatus.MISSING;

  return {
    id: recording.id,
    title: recording.title ?? null,
    status: recording.status ?? null,
    startedAt: timestamp(recording.startedAt),
    endedAt: timestamp(recording.endedAt),
    createdAt: timestamp(recording.createdAt),
    summaryMarkdown: recording.summary?.markdown ?? null,
    transcriptStatus,
    evidenceReference: transcriptIsAvailable
      ? `Call recording ${recording.id} summary`
      : null,
    calendarEventId: recording.calendarEventId ?? null,
  };
};

@Injectable()
export class TeamWorkspaceService {
  constructor(
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    private readonly userRoleService: UserRoleService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
    private readonly roleService: RoleService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getSnapshot({
    lane,
    workspace,
    userWorkspaceId,
    workspaceMemberId,
  }: {
    lane: TeamWorkspaceLane;
    workspace: WorkspaceEntity;
    userWorkspaceId: string;
    workspaceMemberId: string;
  }): Promise<TeamWorkspaceSnapshotDTO> {
    if (
      !this.workspaceDomainsService.isTeamWorkspaceId(workspace.id) ||
      !userWorkspaceId ||
      !workspaceMemberId
    ) {
      throw this.accessDenied();
    }

    const rolesByUserWorkspace =
      await this.userRoleService.getRolesByUserWorkspaces({
        userWorkspaceIds: [userWorkspaceId],
        workspaceId: workspace.id,
      });
    const roles = rolesByUserWorkspace.get(userWorkspaceId) ?? [];
    const roleLabels = roles.map((role) => baseRoleLabel(role.label));
    const hasUnknownRole = roleLabels.some(
      (label) => !KNOWN_ROLE_LABELS.has(label),
    );
    const isAdmin = roleLabels.includes(TEAM_WORKSPACE_ROLE_LABEL.admin);
    const isBothLanes = roleLabels.includes(TEAM_WORKSPACE_ROLE_LABEL.team);
    const hasLaneRole =
      isAdmin ||
      isBothLanes ||
      (lane === TeamWorkspaceLane.SALES
        ? roleLabels.includes(TEAM_WORKSPACE_ROLE_LABEL.sales)
        : roleLabels.includes(TEAM_WORKSPACE_ROLE_LABEL.operations));

    if (
      roles.length === 0 ||
      hasUnknownRole ||
      !hasLaneRole ||
      roles.some((role) => !role.id)
    ) {
      throw this.accessDenied();
    }

    const privilegedReadConfig: RolePermissionConfig = {
      shouldBypassPermissionChecks: true,
    };
    const laneMemberIds = isAdmin
      ? await this.getLaneMemberIds({ lane, workspaceId: workspace.id })
      : [workspaceMemberId];

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(() =>
      this.readSnapshot({
        lane,
        workspaceId: workspace.id,
        laneMemberIds,
        privilegedReadConfig,
      }),
    );
  }

  async getManagementSnapshotForAuthContext(
    authContext: WorkspaceAuthContext,
  ): Promise<TeamManagementSnapshotDTO> {
    if (authContext.type !== 'user') {
      throw this.accessDenied();
    }

    return this.getManagementSnapshot({
      workspace: authContext.workspace as unknown as WorkspaceEntity,
      userWorkspaceId: authContext.userWorkspaceId,
      workspaceMemberId: authContext.workspaceMemberId,
    });
  }

  async getManagementSnapshot({
    workspace,
    userWorkspaceId,
    workspaceMemberId,
  }: {
    workspace: WorkspaceEntity;
    userWorkspaceId: string;
    workspaceMemberId: string;
  }): Promise<TeamManagementSnapshotDTO> {
    if (
      !this.workspaceDomainsService.isTeamWorkspaceId(workspace.id) ||
      !userWorkspaceId ||
      !workspaceMemberId
    ) {
      throw this.accessDenied();
    }

    const rolesByUserWorkspace =
      await this.userRoleService.getRolesByUserWorkspaces({
        userWorkspaceIds: [userWorkspaceId],
        workspaceId: workspace.id,
      });
    const roles = rolesByUserWorkspace.get(userWorkspaceId) ?? [];

    if (
      roles.length !== 1 ||
      baseRoleLabel(roles[0].label) !== TEAM_WORKSPACE_ROLE_LABEL.admin ||
      !roles[0].id
    ) {
      throw this.accessDenied();
    }

    const [salesMembers, operationsMembers] = await Promise.all([
      this.getLaneMembers({
        lane: TeamWorkspaceLane.SALES,
        workspaceId: workspace.id,
      }),
      this.getLaneMembers({
        lane: TeamWorkspaceLane.OPERATIONS,
        workspaceId: workspace.id,
      }),
    ]);
    const salesMemberIds = new Set(salesMembers.map((member) => member.id));
    // A person in both lanes is a misconfiguration UNLESS they hold the Team role, which is
    // both lanes by definition. Anything else overlapping still denies, as it did before.
    const bothLaneMemberIds = new Set(
      (
        await this.getRoleMembers({
          roleLabel: TEAM_WORKSPACE_ROLE_LABEL.team,
          workspaceId: workspace.id,
        })
      ).map((member) => member.id),
    );

    if (
      operationsMembers.some(
        (member) =>
          salesMemberIds.has(member.id) && !bothLaneMemberIds.has(member.id),
      )
    ) {
      throw this.accessDenied();
    }

    const privilegedReadConfig: RolePermissionConfig = {
      shouldBypassPermissionChecks: true,
    };

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const [sales, operations] = await Promise.all([
          this.readSnapshot({
            lane: TeamWorkspaceLane.SALES,
            workspaceId: workspace.id,
            laneMemberIds: salesMembers.map((member) => member.id),
            privilegedReadConfig,
            includeUnassignedSalesWork: true,
          }),
          this.readSnapshot({
            lane: TeamWorkspaceLane.OPERATIONS,
            workspaceId: workspace.id,
            laneMemberIds: operationsMembers.map((member) => member.id),
            privilegedReadConfig,
          }),
        ]);

        return {
          generatedAt: new Date().toISOString(),
          members: [
            ...this.managementMembers(salesMembers, TeamWorkspaceLane.SALES),
            ...this.managementMembers(
              operationsMembers,
              TeamWorkspaceLane.OPERATIONS,
            ),
          ],
          sales,
          operations,
        };
      },
    );
  }

  async getSnapshotForAuthContext({
    lane,
    authContext,
  }: {
    lane: TeamWorkspaceLane;
    authContext: WorkspaceAuthContext;
  }): Promise<TeamWorkspaceSnapshotDTO> {
    if (
      authContext.type !== 'apiKey' ||
      !this.workspaceDomainsService.isTeamWorkspaceId(authContext.workspace.id)
    ) {
      throw this.accessDenied();
    }

    const role = await this.apiKeyRoleService.getRoleDtoByApiKeyId({
      apiKeyId: authContext.apiKey.id,
      workspaceId: authContext.workspace.id,
    });

    if (
      baseRoleLabel(role.label) !== TEAM_WORKSPACE_ROLE_LABEL.automation ||
      !role.id
    ) {
      throw this.accessDenied();
    }

    const laneMemberIds = await this.getLaneMemberIds({
      lane,
      workspaceId: authContext.workspace.id,
    });
    const privilegedReadConfig: RolePermissionConfig = {
      shouldBypassPermissionChecks: true,
    };

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.readSnapshot({
          lane,
          workspaceId: authContext.workspace.id,
          laneMemberIds,
          privilegedReadConfig,
        }),
      authContext,
    );
  }

  private async getLaneMemberIds({
    lane,
    workspaceId,
  }: {
    lane: TeamWorkspaceLane;
    workspaceId: string;
  }): Promise<string[]> {
    return (
      await this.getLaneMembers({
        lane,
        workspaceId,
      })
    ).map((member) => member.id);
  }

  // Members holding one role label. Returns [] when the role does not exist in the workspace,
  // so an optional role (Team) never breaks a workspace that has not created it.
  private async getRoleMembers({
    roleLabel,
    workspaceId,
  }: {
    roleLabel: string;
    workspaceId: string;
  }): Promise<LaneWorkspaceMember[]> {
    const roles = (
      await this.roleService.getWorkspaceRoles(workspaceId)
    ).filter((role) => role.label === roleLabel);

    if (roles.length > 1) {
      throw this.accessDenied();
    }

    if (roles.length === 0) {
      return [];
    }

    const members =
      await this.userRoleService.getWorkspaceMembersAssignedToRole(
        roles[0].id,
        workspaceId,
      );

    const uniqueMembers = new Map<string, LaneWorkspaceMember>();

    for (const member of members) {
      if (member.id) {
        uniqueMembers.set(member.id, member as LaneWorkspaceMember);
      }
    }

    return [...uniqueMembers.values()];
  }

  private async getLaneMembers({
    lane,
    workspaceId,
  }: {
    lane: TeamWorkspaceLane;
    workspaceId: string;
  }): Promise<LaneWorkspaceMember[]> {
    const expectedRoleLabel =
      lane === TeamWorkspaceLane.SALES
        ? TEAM_WORKSPACE_ROLE_LABEL.sales
        : TEAM_WORKSPACE_ROLE_LABEL.operations;
    const workspaceRoles =
      await this.roleService.getWorkspaceRoles(workspaceId);
    const matchingRoles = workspaceRoles.filter(
      (role) => baseRoleLabel(role.label) === expectedRoleLabel,
    );

    if (matchingRoles.length !== 1) {
      throw this.accessDenied();
    }

    // Someone on the Team role works both lanes, so they are a member of this one too.
    // The role is optional: a workspace that has not created it still resolves normally.
    const bothLaneRoles = workspaceRoles.filter(
      (role) => baseRoleLabel(role.label) === TEAM_WORKSPACE_ROLE_LABEL.team,
    );

    if (bothLaneRoles.length > 1) {
      throw this.accessDenied();
    }

    const membersByRole = await Promise.all(
      [...matchingRoles, ...bothLaneRoles].map((role) =>
        this.userRoleService.getWorkspaceMembersAssignedToRole(
          role.id,
          workspaceId,
        ),
      ),
    );

    const uniqueMembers = new Map<string, LaneWorkspaceMember>();

    for (const member of membersByRole.flat()) {
      if (member.id) {
        uniqueMembers.set(member.id, member as LaneWorkspaceMember);
      }
    }

    return [...uniqueMembers.values()];
  }

  private managementMembers(
    members: LaneWorkspaceMember[],
    lane: TeamWorkspaceLane,
  ): TeamManagementMemberDTO[] {
    return members.map((member) => ({
      id: member.id,
      name: fullName(member.name),
      lane,
    }));
  }

  private async readSnapshot({
    lane,
    workspaceId,
    laneMemberIds,
    privilegedReadConfig,
    includeUnassignedSalesWork = false,
  }: {
    lane: TeamWorkspaceLane;
    workspaceId: string;
    laneMemberIds: string[];
    privilegedReadConfig: RolePermissionConfig;
    includeUnassignedSalesWork?: boolean;
  }): Promise<TeamWorkspaceSnapshotDTO> {
    const [taskIndex, meetingIndex] = await Promise.all([
      this.readTaskIndex({
        lane,
        workspaceId,
        laneMemberIds,
        privilegedReadConfig,
        includeUnassignedSalesWork,
      }),
      this.readMeetings({
        workspaceId,
        laneMemberIds,
        privilegedReadConfig,
      }),
    ]);

    const baseTasks = taskIndex.filter(
      (task) =>
        canReadTask({ task, lane, laneMemberIds }) ||
        (lane === TeamWorkspaceLane.SALES &&
          includeUnassignedSalesWork &&
          isUnassignedActiveSalesTask(task)),
    );
    const baseTaskIds = new Set(baseTasks.map((task) => task.id));
    const tasks = taskIndex.filter((task) => {
      if (baseTaskIds.has(task.id)) {
        return true;
      }

      const evidenceTargetId = referencedTaskId(
        task,
        TEAM_WORKSPACE_RECORD_PREFIX.completionEvidence,
      );

      return evidenceTargetId !== null && baseTaskIds.has(evidenceTargetId);
    });
    const meetings = meetingIndex.filter((meeting) =>
      meeting.calendarEventParticipants.some((participant) => {
        const participantWorkspaceMemberId =
          participant.workspaceMemberId ?? participant.workspaceMember?.id;

        return (
          participantWorkspaceMemberId !== null &&
          participantWorkspaceMemberId !== undefined &&
          laneMemberIds.includes(participantWorkspaceMemberId)
        );
      }),
    );
    const handoffs = tasks.filter(isHandoff);
    const detailTaskIds = tasks
      .filter((task) => isDetailTask(task, lane))
      .map((task) => task.id);
    const detailTaskIdSet = new Set(detailTaskIds);

    const [taskDetails, opportunities, callRecordings] = await Promise.all([
      this.readTaskDetails({
        ids: tasks.map((task) => task.id),
        workspaceId,
        privilegedReadConfig,
      }),
      this.readOpportunities({
        lane,
        handoffs,
        workspaceId,
        privilegedReadConfig,
      }),
      this.readCallRecordings({
        lane,
        meetingIds: meetings.map((meeting) => meeting.id),
        workspaceId,
        privilegedReadConfig,
      }),
    ]);
    const detailsById = new Map(
      taskDetails.map((task) => [task.id, task] as const),
    );
    const tasksWithDetails = tasks.map((task) => {
      const detail = detailsById.get(task.id);

      return {
        ...task,
        ...(detailTaskIdSet.has(task.id) ? detail : {}),
        assignmentDetail: assignmentDetailFromMarkdown(
          detail?.bodyV2?.markdown,
        ),
      };
    });
    const allowedMeetingIds = new Set(meetings.map((meeting) => meeting.id));
    const safeCallRecordings = callRecordings.filter(
      (recording) =>
        recording.calendarEventId !== null &&
        allowedMeetingIds.has(recording.calendarEventId),
    );
    const clients = await this.readClients({
      lane,
      tasks: tasksWithDetails,
      opportunities,
      meetings,
      workspaceId,
      privilegedReadConfig,
    });

    return {
      lane,
      generatedAt: new Date().toISOString(),
      tasks: tasksWithDetails.map(taskDto),
      handoffs: tasksWithDetails.filter(isHandoff).map(taskDto),
      opportunities: opportunities.map(opportunityDto),
      clients: clients.map(clientDto),
      meetings: meetings.map(meetingDto),
      callRecordings: safeCallRecordings.map(callRecordingDto),
    };
  }

  private async readTaskIndex({
    lane,
    workspaceId,
    laneMemberIds,
    privilegedReadConfig,
    includeUnassignedSalesWork,
  }: {
    lane: TeamWorkspaceLane;
    workspaceId: string;
    laneMemberIds: string[];
    privilegedReadConfig: RolePermissionConfig;
    includeUnassignedSalesWork: boolean;
  }): Promise<TeamTaskEntity[]> {
    if (
      lane === TeamWorkspaceLane.SALES &&
      laneMemberIds.length === 0 &&
      !includeUnassignedSalesWork
    ) {
      return [];
    }

    const repository =
      await this.globalWorkspaceOrmManager.getRepository<TeamTaskEntity>(
        workspaceId,
        'task',
        privilegedReadConfig,
      );
    const where: FindOptionsWhere<TeamTaskEntity>[] =
      lane === TeamWorkspaceLane.SALES
        ? [
            ...laneMemberIds.flatMap<FindOptionsWhere<TeamTaskEntity>>(
              (workspaceMemberId) => [
                { assigneeId: workspaceMemberId },
                { createdBy: { workspaceMemberId } },
              ],
            ),
            {
              title: ILike(
                `${TEAM_WORKSPACE_RECORD_PREFIX.completionEvidence}%`,
              ),
            },
            ...(includeUnassignedSalesWork
              ? [
                  {
                    assigneeId: IsNull(),
                    status: In(['TODO', 'IN_PROGRESS']),
                    workType: 'OUTREACH',
                  },
                ]
              : []),
          ]
        : [
            { workType: 'SOFTWARE' },
            { title: ILike(`${TEAM_WORKSPACE_RECORD_PREFIX.blocker}%`) },
            { title: ILike(`${TEAM_WORKSPACE_RECORD_PREFIX.clientUpdate}%`) },
            {
              title: ILike(
                `${TEAM_WORKSPACE_RECORD_PREFIX.completionEvidence}%`,
              ),
            },
            { title: ILike(`${TEAM_WORKSPACE_RECORD_PREFIX.handoff}%`) },
            { title: ILike(`${TEAM_WORKSPACE_RECORD_PREFIX.handoffReturn}%`) },
            {
              title: ILike(`${TEAM_WORKSPACE_RECORD_PREFIX.meetingOutcome}%`),
            },
            { title: ILike(`${TEAM_WORKSPACE_RECORD_PREFIX.meetingPrep}%`) },
            { title: ILike(`${TEAM_WORKSPACE_RECORD_PREFIX.promise}%`) },
          ];

    return repository.find({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        workType: true,
        client: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,
        assigneeId: true,
        assignee: { id: true, nameFirstName: true, nameLastName: true },
        createdByWorkspaceMemberId: true,
        createdByName: true,
      },
      relations: { assignee: true },
      order: { dueAt: 'ASC', createdAt: 'DESC' },
      take: TEAM_WORKSPACE_QUERY_LIMIT.tasks,
    });
  }

  private async readTaskDetails({
    ids,
    workspaceId,
    privilegedReadConfig,
  }: {
    ids: string[];
    workspaceId: string;
    privilegedReadConfig: RolePermissionConfig;
  }): Promise<TeamTaskEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository =
      await this.globalWorkspaceOrmManager.getRepository<TeamTaskEntity>(
        workspaceId,
        'task',
        privilegedReadConfig,
      );

    return repository.find({
      where: { id: In(ids) },
      select: {
        id: true,
        bodyV2Markdown: true,
        createdByWorkspaceMemberId: true,
        createdByName: true,
      },
      take: TEAM_WORKSPACE_QUERY_LIMIT.tasks,
    });
  }

  private async readOpportunities({
    lane,
    handoffs,
    workspaceId,
    privilegedReadConfig,
  }: {
    lane: TeamWorkspaceLane;
    handoffs: TeamTaskEntity[];
    workspaceId: string;
    privilegedReadConfig: RolePermissionConfig;
  }): Promise<TeamOpportunityEntity[]> {
    const handoffOpportunityIds = handoffs
      .filter((handoff) =>
        handoff.title?.startsWith(
          `${TEAM_WORKSPACE_RECORD_PREFIX.handoff} ${handoff.id} ·`,
        ),
      )
      .map((handoff) => handoff.id);

    if (
      lane === TeamWorkspaceLane.OPERATIONS &&
      handoffOpportunityIds.length === 0
    ) {
      return [];
    }

    const repository =
      await this.globalWorkspaceOrmManager.getRepository<TeamOpportunityEntity>(
        workspaceId,
        'opportunity',
        privilegedReadConfig,
      );
    const where =
      lane === TeamWorkspaceLane.OPERATIONS
        ? { id: In(handoffOpportunityIds) }
        : undefined;
    const opportunities = await repository.find({
      where,
      select: {
        id: true,
        name: true,
        stage: true,
        client: true,
        closeDate: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        owner: { id: true, nameFirstName: true, nameLastName: true },
        company: { id: true, name: true },
        pointOfContact: {
          id: true,
          nameFirstName: true,
          nameLastName: true,
        },
      },
      relations: { owner: true, company: true, pointOfContact: true },
      order: { updatedAt: 'DESC' },
      take: TEAM_WORKSPACE_QUERY_LIMIT.opportunities,
    });
    const allowedHandoffIds = new Set(handoffOpportunityIds);

    return lane === TeamWorkspaceLane.OPERATIONS
      ? opportunities.filter((opportunity) =>
          allowedHandoffIds.has(opportunity.id),
        )
      : opportunities;
  }

  private async readMeetings({
    workspaceId,
    laneMemberIds,
    privilegedReadConfig,
  }: {
    workspaceId: string;
    laneMemberIds: string[];
    privilegedReadConfig: RolePermissionConfig;
  }): Promise<TeamMeetingEntity[]> {
    if (laneMemberIds.length === 0) {
      return [];
    }

    const repository =
      await this.globalWorkspaceOrmManager.getRepository<TeamMeetingEntity>(
        workspaceId,
        'calendarEvent',
        privilegedReadConfig,
      );

    return repository.find({
      where: {
        calendarEventParticipants: { workspaceMemberId: In(laneMemberIds) },
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        isCanceled: true,
        isFullDay: true,
        conferenceLinkPrimaryLinkUrl: true,
        calendarEventParticipants: {
          id: true,
          displayName: true,
          isOrganizer: true,
          responseStatus: true,
          workspaceMemberId: true,
          person: {
            id: true,
            nameFirstName: true,
            nameLastName: true,
            client: true,
            company: { id: true, name: true },
          },
          workspaceMember: {
            id: true,
            nameFirstName: true,
            nameLastName: true,
          },
        },
      },
      relations: {
        calendarEventParticipants: {
          person: { company: true },
          workspaceMember: true,
        },
      },
      order: { startsAt: 'DESC' },
      take: TEAM_WORKSPACE_QUERY_LIMIT.meetings,
    });
  }

  private async readCallRecordings({
    lane,
    meetingIds,
    workspaceId,
    privilegedReadConfig,
  }: {
    lane: TeamWorkspaceLane;
    meetingIds: string[];
    workspaceId: string;
    privilegedReadConfig: RolePermissionConfig;
  }): Promise<TeamCallRecordingEntity[]> {
    if (lane !== TeamWorkspaceLane.SALES || meetingIds.length === 0) {
      return [];
    }

    const repository =
      await this.globalWorkspaceOrmManager.getRepository<TeamCallRecordingEntity>(
        workspaceId,
        'callRecording',
        privilegedReadConfig,
      );

    // Raw transcript structure never leaves this boundary. Only availability
    // and a nonverbatim recording reference are projected.
    return repository.find({
      where: { calendarEventId: In(meetingIds) },
      select: {
        id: true,
        title: true,
        status: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        summaryMarkdown: true,
        transcript: true,
        calendarEventId: true,
      },
      order: { startedAt: 'DESC', createdAt: 'DESC' },
      take: TEAM_WORKSPACE_QUERY_LIMIT.callRecordings,
    });
  }

  private async readClients({
    lane,
    tasks,
    opportunities,
    meetings,
    workspaceId,
    privilegedReadConfig,
  }: {
    lane: TeamWorkspaceLane;
    tasks: TeamTaskEntity[];
    opportunities: TeamOpportunityEntity[];
    meetings: TeamMeetingEntity[];
    workspaceId: string;
    privilegedReadConfig: RolePermissionConfig;
  }): Promise<TeamClientEntity[]> {
    const repository =
      await this.globalWorkspaceOrmManager.getRepository<TeamClientEntity>(
        workspaceId,
        'client',
        privilegedReadConfig,
      );
    const scopes = new Set<string>();

    tasks.forEach((task) => task.client && scopes.add(task.client));
    opportunities.forEach(
      (opportunity) => opportunity.client && scopes.add(opportunity.client),
    );
    meetings.forEach((meeting) =>
      meeting.calendarEventParticipants.forEach(
        (participant) =>
          participant.person?.client && scopes.add(participant.person.client),
      ),
    );

    if (lane === TeamWorkspaceLane.SALES && scopes.size === 0) {
      return [];
    }

    const clients = await repository.find({
      where:
        lane === TeamWorkspaceLane.SALES
          ? { client: In([...scopes]) }
          : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        client: true,
        status: true,
      },
      order: { name: 'ASC' },
      take: TEAM_WORKSPACE_QUERY_LIMIT.clients,
    });

    return lane === TeamWorkspaceLane.SALES
      ? clients.filter(
          (client) => client.client !== null && scopes.has(client.client),
        )
      : clients;
  }

  private accessDenied(): ForbiddenException {
    return new ForbiddenException(
      'This account is not authorized for the requested team workspace.',
    );
  }
}
