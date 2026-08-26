import { ForbiddenException } from '@nestjs/common';

import { type ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { TeamWorkspaceTranscriptStatus } from 'src/engine/core-modules/team-workspace/dtos/team-workspace-snapshot.dto';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';
import { TeamWorkspaceService } from 'src/engine/core-modules/team-workspace/team-workspace.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import { type UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

const WORKSPACE_MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const USER_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
const OPPORTUNITY_ID = '33333333-3333-4333-8333-333333333333';
const MEETING_ID = '44444444-4444-4444-8444-444444444444';

const workspace = {
  id: '55555555-5555-4555-8555-555555555555',
  displayName: 'Prospect Engine',
} as WorkspaceEntity;

const member = (id = WORKSPACE_MEMBER_ID) => ({
  id,
  name: { firstName: 'Abrar', lastName: 'Hossain' },
});

const participant = (
  workspaceMemberId = WORKSPACE_MEMBER_ID,
  client = 'acme',
) => ({
  id: '66666666-6666-4666-8666-666666666666',
  displayName: 'Client contact',
  isOrganizer: false,
  responseStatus: 'ACCEPTED',
  person: {
    id: '77777777-7777-4777-8777-777777777777',
    name: { firstName: 'Client', lastName: 'Contact' },
    client,
    company: { id: '88888888-8888-4888-8888-888888888888', name: 'Acme' },
  },
  workspaceMemberId,
  workspaceMember: member(workspaceMemberId),
});

const meeting = (id = MEETING_ID, workspaceMemberId = WORKSPACE_MEMBER_ID) => ({
  id,
  title: 'Discovery call',
  description: 'Agree next step',
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T10:30:00.000Z',
  isCanceled: false,
  isFullDay: false,
  conferenceLink: { primaryLinkUrl: 'https://meet.example.test/call' },
  calendarEventParticipants: [participant(workspaceMemberId)],
});

const task = ({
  id,
  title,
  ownerId = WORKSPACE_MEMBER_ID,
  workType = 'OUTREACH',
}: {
  id: string;
  title: string;
  ownerId?: string;
  workType?: string;
}) => ({
  id,
  title,
  status: 'TODO',
  workType,
  client: 'acme',
  dueAt: '2026-08-27T09:00:00.000Z',
  createdAt: '2026-08-26T09:00:00.000Z',
  updatedAt: '2026-08-26T09:00:00.000Z',
  assigneeId: ownerId,
  assignee: member(ownerId),
  createdBy: { workspaceMemberId: ownerId, name: 'Abrar Hossain' },
});

type RepositoryMock = { find: jest.Mock };

const makeRepository = (): RepositoryMock => ({ find: jest.fn() });

const buildHarness = (roleLabel: string) => {
  const repositories = {
    task: makeRepository(),
    opportunity: makeRepository(),
    client: makeRepository(),
    calendarEvent: makeRepository(),
    callRecording: makeRepository(),
  };
  const role = { id: `role-${roleLabel.toLowerCase()}`, label: roleLabel };
  const userRoleService = {
    getRolesByUserWorkspaces: jest
      .fn()
      .mockResolvedValue(new Map([[USER_WORKSPACE_ID, [role]]])),
    getWorkspaceMembersAssignedToRole: jest.fn().mockResolvedValue([member()]),
  };
  const apiKeyRoleService = {
    getRoleDtoByApiKeyId: jest.fn().mockResolvedValue({
      id: 'role-team-automation',
      label: 'Team Automation',
    }),
  };
  const roleService = {
    getWorkspaceRoles: jest.fn().mockResolvedValue([
      { id: 'role-sales', label: 'Sales' },
      { id: 'role-operations', label: 'Operations' },
    ]),
  };
  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn(
      (callback: () => unknown, _authContext?: WorkspaceAuthContext) =>
        callback(),
    ),
    getRepository: jest.fn(
      (
        _workspaceId: string,
        objectName: keyof typeof repositories,
        _permissionConfig?: unknown,
      ) => repositories[objectName],
    ),
  };
  const workspaceDomainsService = {
    isTeamWorkspaceId: jest.fn(
      (workspaceId: string) => workspaceId === workspace.id,
    ),
  };
  const service = new TeamWorkspaceService(
    workspaceDomainsService as unknown as WorkspaceDomainsService,
    userRoleService as unknown as UserRoleService,
    apiKeyRoleService as unknown as ApiKeyRoleService,
    roleService as unknown as RoleService,
    globalWorkspaceOrmManager as unknown as GlobalWorkspaceOrmManager,
  );

  return {
    apiKeyRoleService,
    globalWorkspaceOrmManager,
    repositories,
    role,
    roleService,
    service,
    userRoleService,
    workspaceDomainsService,
  };
};

describe('TeamWorkspaceService', () => {
  it('returns an owned Sales projection with bounded transcript evidence', async () => {
    const harness = buildHarness('Sales');
    const prepTask = task({
      id: '99999999-9999-4999-8999-999999999999',
      title: `Meeting prep · ${MEETING_ID} · Discovery call`,
    });
    const otherTask = task({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      title: 'Private task',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    harness.repositories.task.find.mockImplementation(
      (options: { select?: { bodyV2Markdown?: unknown } }) =>
        options.select?.bodyV2Markdown
          ? Promise.resolve([
              {
                id: prepTask.id,
                bodyV2: { markdown: '**Preparation:** Ask about scope' },
                createdBy: {
                  workspaceMemberId: WORKSPACE_MEMBER_ID,
                  name: 'Abrar Hossain',
                },
              },
            ])
          : Promise.resolve([prepTask, otherTask]),
    );
    harness.repositories.calendarEvent.find.mockResolvedValue([
      meeting(),
      meeting(
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ),
    ]);
    harness.repositories.opportunity.find.mockResolvedValue([
      {
        id: OPPORTUNITY_ID,
        name: 'Acme opportunity',
        stage: 'MEETING',
        client: 'acme',
        closeDate: null,
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
        ownerId: WORKSPACE_MEMBER_ID,
        owner: member(),
        company: { id: 'company-id', name: 'Acme' },
        pointOfContact: { id: 'person-id', name: { firstName: 'Client' } },
      },
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        name: 'Other owner opportunity',
        ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      },
    ]);
    harness.repositories.callRecording.find.mockResolvedValue([
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        title: 'Discovery call',
        status: 'DONE',
        startedAt: '2026-08-27T10:00:00.000Z',
        endedAt: '2026-08-27T10:30:00.000Z',
        createdAt: '2026-08-27T10:31:00.000Z',
        summary: { markdown: 'Client needs a proposal.' },
        transcript: {
          segments: [
            {
              text: `distinctive transcript phrase ${'important details '.repeat(30)}`,
            },
          ],
          providerPayload: { token: 'must-not-leak' },
        },
        calendarEventId: MEETING_ID,
      },
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        transcript: { text: 'other meeting transcript' },
        calendarEventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      },
    ]);
    harness.repositories.client.find.mockResolvedValue([
      {
        id: 'client-acme',
        name: 'Acme',
        slug: 'acme',
        client: 'acme',
        status: 'Active',
      },
      {
        id: 'client-other',
        name: 'Other',
        slug: 'other',
        client: 'other',
        status: 'Active',
      },
    ]);

    const snapshot = await harness.service.getSnapshot({
      lane: TeamWorkspaceLane.SALES,
      workspace,
      userWorkspaceId: USER_WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
    });

    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.tasks[0].bodyMarkdown).toBe(
      '**Preparation:** Ask about scope',
    );
    expect(snapshot.meetings).toHaveLength(1);
    expect(snapshot.opportunities).toHaveLength(2);
    expect(snapshot.clients).toHaveLength(1);
    expect(snapshot.callRecordings).toHaveLength(1);
    expect(snapshot.callRecordings[0].transcriptStatus).toBe(
      TeamWorkspaceTranscriptStatus.AVAILABLE,
    );
    expect(snapshot.callRecordings[0].evidenceReference).toBe(
      'Call recording eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee summary',
    );
    expect(JSON.stringify(snapshot)).not.toContain(
      'distinctive transcript phrase',
    );
    expect(JSON.stringify(snapshot)).not.toContain('providerPayload');
    expect(JSON.stringify(snapshot)).not.toContain('must-not-leak');

    const callRecordingFind =
      harness.repositories.callRecording.find.mock.calls[0][0];
    const [taskIndexFind, taskDetailsFind] =
      harness.repositories.task.find.mock.calls.map(([options]) => options);
    const meetingFind =
      harness.repositories.calendarEvent.find.mock.calls[0][0];

    expect(callRecordingFind.select.transcript).toBe(true);
    expect(callRecordingFind.select.summaryMarkdown).toBe(true);
    expect(callRecordingFind.select).not.toHaveProperty('summary');
    expect(taskIndexFind.select).toEqual(
      expect.objectContaining({
        createdByWorkspaceMemberId: true,
        createdByName: true,
      }),
    );
    expect(taskIndexFind.select).not.toHaveProperty('createdBy');
    expect(taskIndexFind.select.assignee).toEqual(
      expect.objectContaining({
        nameFirstName: true,
        nameLastName: true,
      }),
    );
    expect(taskIndexFind.select.assignee).not.toHaveProperty('name');
    expect(taskDetailsFind.select).toEqual(
      expect.objectContaining({
        bodyV2Markdown: true,
        createdByWorkspaceMemberId: true,
        createdByName: true,
      }),
    );
    expect(taskDetailsFind.select).not.toHaveProperty('bodyV2');
    expect(taskDetailsFind.select).not.toHaveProperty('createdBy');
    expect(meetingFind.select.conferenceLinkPrimaryLinkUrl).toBe(true);
    expect(meetingFind.select).not.toHaveProperty('conferenceLink');
    for (const call of harness.globalWorkspaceOrmManager.getRepository.mock
      .calls) {
      expect(call[2]).toEqual({ shouldBypassPermissionChecks: true });
    }
    expect(
      harness.workspaceDomainsService.isTeamWorkspaceId,
    ).toHaveBeenCalledWith(workspace.id);
  });

  it('returns Operations-owned work and full handoffs without reading recordings', async () => {
    const harness = buildHarness('Operations');
    const ownTask = task({
      id: 'aaaaaaaa-1111-4111-8111-111111111111',
      title: 'Build landing page',
      workType: 'SOFTWARE',
    });
    const handoff = task({
      id: OPPORTUNITY_ID,
      title: `Handoff · ${OPPORTUNITY_ID} · Acme`,
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    const otherTask = task({
      id: 'aaaaaaaa-2222-4222-8222-222222222222',
      title: 'Another operator private task',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      workType: 'SOFTWARE',
    });
    const salesMeetingPrep = task({
      id: 'aaaaaaaa-5555-4555-8555-555555555555',
      title: `Meeting prep · ${MEETING_ID} · Sales-only call`,
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    const ownedSalesTask = task({
      id: 'aaaaaaaa-8888-4888-8888-888888888888',
      title: 'Sales outreach accidentally assigned to Operations',
    });
    const unrelatedSalesEvidence = task({
      id: 'aaaaaaaa-6666-4666-8666-666666666666',
      title: 'Completion evidence · aaaaaaaa-7777-4777-8777-777777777777',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    harness.repositories.task.find.mockImplementation(
      (options: { select?: { bodyV2Markdown?: unknown } }) =>
        options.select?.bodyV2Markdown
          ? Promise.resolve([
              {
                id: OPPORTUNITY_ID,
                bodyV2: { markdown: '**Contact:** Client Contact' },
                createdBy: {
                  workspaceMemberId: 'sales-member',
                  name: 'Abrar Hossain',
                },
              },
            ])
          : Promise.resolve([
              ownTask,
              handoff,
              otherTask,
              salesMeetingPrep,
              ownedSalesTask,
              unrelatedSalesEvidence,
            ]),
    );
    harness.repositories.calendarEvent.find.mockResolvedValue([meeting()]);
    harness.repositories.opportunity.find.mockResolvedValue([
      {
        id: OPPORTUNITY_ID,
        name: 'Acme opportunity',
        stage: 'WON',
        client: 'acme',
        ownerId: 'sales-member',
      },
      { id: 'not-handed-off', name: 'Other opportunity' },
    ]);
    harness.repositories.client.find.mockResolvedValue([
      {
        id: 'client-acme',
        name: 'Acme',
        slug: 'acme',
        client: 'acme',
        status: 'Active',
      },
    ]);

    const snapshot = await harness.service.getSnapshot({
      lane: TeamWorkspaceLane.OPERATIONS,
      workspace,
      userWorkspaceId: USER_WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
    });

    expect(snapshot.tasks.map(({ id }) => id)).toEqual([
      ownTask.id,
      handoff.id,
      otherTask.id,
    ]);
    expect(snapshot.handoffs).toEqual([
      expect.objectContaining({
        id: handoff.id,
        bodyMarkdown: '**Contact:** Client Contact',
      }),
    ]);
    expect(snapshot.opportunities.map(({ id }) => id)).toEqual([
      OPPORTUNITY_ID,
    ]);
    expect(snapshot.callRecordings).toEqual([]);
    expect(
      harness.globalWorkspaceOrmManager.getRepository,
    ).not.toHaveBeenCalledWith(
      workspace.id,
      'callRecording',
      expect.anything(),
    );
  });

  it('allows only Team Automation API keys to request a lane-wide safe snapshot', async () => {
    const harness = buildHarness('Sales');
    const ownTask = task({
      id: 'aaaaaaaa-3333-4333-8333-333333333333',
      title: 'Follow up with Acme',
    });
    const otherTask = task({
      id: 'aaaaaaaa-4444-4444-8444-444444444444',
      title: 'Another salesperson private task',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    harness.repositories.task.find.mockResolvedValue([ownTask, otherTask]);
    harness.repositories.calendarEvent.find.mockResolvedValue([meeting()]);
    harness.repositories.opportunity.find.mockResolvedValue([
      {
        id: OPPORTUNITY_ID,
        name: 'Lane-wide pipeline record',
        stage: 'MEETING',
        client: 'acme',
        ownerId: 'another-sales-member',
      },
    ]);
    harness.repositories.callRecording.find.mockResolvedValue([]);
    harness.repositories.client.find.mockResolvedValue([
      {
        id: 'client-acme',
        name: 'Acme',
        slug: 'acme',
        client: 'acme',
        status: 'Active',
      },
    ]);
    const authContext = {
      type: 'apiKey',
      workspace,
      apiKey: { id: 'automation-api-key-id' },
    } as unknown as WorkspaceAuthContext;

    const snapshot = await harness.service.getSnapshotForAuthContext({
      lane: TeamWorkspaceLane.SALES,
      authContext,
    });

    expect(snapshot.tasks.map(({ id }) => id)).toEqual([ownTask.id]);
    expect(snapshot.opportunities.map(({ id }) => id)).toEqual([
      OPPORTUNITY_ID,
    ]);
    expect(harness.apiKeyRoleService.getRoleDtoByApiKeyId).toHaveBeenCalledWith(
      {
        apiKeyId: 'automation-api-key-id',
        workspaceId: workspace.id,
      },
    );
    expect(
      harness.globalWorkspaceOrmManager.executeInWorkspaceContext.mock
        .calls[0][1],
    ).toBe(authContext);
  });

  it('fails closed for an API key without the Team Automation role', async () => {
    const harness = buildHarness('Sales');

    harness.apiKeyRoleService.getRoleDtoByApiKeyId.mockResolvedValue({
      id: 'role-sales',
      label: 'Sales',
    });

    await expect(
      harness.service.getSnapshotForAuthContext({
        lane: TeamWorkspaceLane.SALES,
        authContext: {
          type: 'apiKey',
          workspace,
          apiKey: { id: 'wrong-role-api-key' },
        } as unknown as WorkspaceAuthContext,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      harness.globalWorkspaceOrmManager.executeInWorkspaceContext,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['Sales', TeamWorkspaceLane.OPERATIONS],
    ['Operations', TeamWorkspaceLane.SALES],
    ['Unknown', TeamWorkspaceLane.SALES],
  ])('fails closed for role %s requesting %s', async (role, lane) => {
    const harness = buildHarness(role);

    await expect(
      harness.service.getSnapshot({
        lane,
        workspace,
        userWorkspaceId: USER_WORKSPACE_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      harness.globalWorkspaceOrmManager.executeInWorkspaceContext,
    ).not.toHaveBeenCalled();
  });

  it('fails closed outside the configured immutable team workspace identity', async () => {
    const harness = buildHarness('Admin');

    await expect(
      harness.service.getSnapshot({
        lane: TeamWorkspaceLane.SALES,
        workspace: { ...workspace, id: 'different-workspace-id' },
        userWorkspaceId: USER_WORKSPACE_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      harness.userRoleService.getRolesByUserWorkspaces,
    ).not.toHaveBeenCalled();
  });
});
