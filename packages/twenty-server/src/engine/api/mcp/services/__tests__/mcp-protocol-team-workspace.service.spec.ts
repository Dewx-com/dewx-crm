import { type ToolSet } from 'ai';

import { McpProtocolService } from 'src/engine/api/mcp/services/mcp-protocol.service';
import { McpToolExecutorService } from 'src/engine/api/mcp/services/mcp-tool-executor.service';
import {
  TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME,
  TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME,
  TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME,
  TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME,
  TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME,
  TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME,
  TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME,
} from 'src/engine/api/mcp/tools/team-workspace.tool';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type ToolRegistryService } from 'src/engine/core-modules/tool-provider/services/tool-registry.service';
import { type UserEntity } from 'src/engine/core-modules/user/user.entity';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { type WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type SkillService } from 'src/engine/metadata-modules/skill/skill.service';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

type ToolListResponse = {
  result: {
    tools: Array<{
      name: string;
      annotations?: {
        readOnlyHint: boolean;
        openWorldHint: boolean;
        destructiveHint: boolean;
      };
    }>;
  };
};

type ToolCallResponse = {
  result: {
    content: Array<{ type: string; text: string }>;
    isError: boolean;
  };
};

type ToolErrorResponse = {
  error: { code: number; message: string };
};

type InitializeResponse = {
  result: { instructions: string };
};

const workspace = { id: 'workspace-id' } as FlatWorkspace;
const userWorkspaceId = 'user-workspace-id';
const user = { id: 'user-id' } as UserEntity;
const workspaceMember = {
  id: 'workspace-member-id',
  name: { firstName: 'Sales', lastName: 'Operator' },
};
const userAuthContext = {
  type: 'user',
  workspace,
  user,
  userWorkspaceId,
  workspaceMemberId: workspaceMember.id,
  workspaceMember,
} as unknown as WorkspaceAuthContext;

const snapshot = {
  lane: 'sales',
  generatedAt: '2026-08-26T00:00:00.000Z',
  tasks: [],
  handoffs: [],
  opportunities: [],
  clients: [],
  meetings: [],
  callRecordings: [],
};
const receipt = {
  command: 'completeTaskWithEvidence',
  receiptKey: 'receipt-key',
  targetId: 'b5f78b5b-416b-4d83-81d8-7f0b6d8fd42e',
  sideEffectRecordId: '1df1714e-56a3-4f26-94f2-b899c80ea329',
  payloadHash: 'hash',
  resultState: 'DONE',
  resultVersion: '2026-08-26T00:00:01.000Z',
  committedAt: '2026-08-26T00:00:01.000Z',
  replayed: false,
};

const createHarness = (roleInput: string | string[] = 'Sales') => {
  const roleLabels = Array.isArray(roleInput) ? roleInput : [roleInput];
  const toolRegistry = {
    getToolsByName: jest.fn().mockResolvedValue({} satisfies ToolSet),
  };
  const userRoleService = {
    getRoleIdForUserWorkspace: jest.fn().mockResolvedValue('role-id'),
    getRolesByUserWorkspaces: jest.fn().mockResolvedValue(
      new Map([
        [
          userWorkspaceId,
          roleLabels.map((label, index) => ({
            id: `role-id-${index}`,
            label,
          })),
        ],
      ]),
    ),
  };
  const apiKeyRoleService = {
    getRoleIdForApiKeyId: jest.fn().mockResolvedValue('role-id'),
    getRoleDtoByApiKeyId: jest
      .fn()
      .mockResolvedValue({ id: 'role-id', label: 'Team Automation' }),
  };
  const metricsService = {
    incrementCounterBy: jest.fn(),
    recordHistogram: jest.fn(),
  };
  const teamWorkspaceService = {
    getSnapshot: jest.fn().mockResolvedValue(snapshot),
    getSnapshotForAuthContext: jest.fn().mockResolvedValue(snapshot),
  };
  const teamWorkspaceCommandService = {
    completeTaskWithEvidence: jest.fn().mockResolvedValue(receipt),
    createAssignedWork: jest.fn().mockResolvedValue(receipt),
    createProtocolTask: jest.fn().mockResolvedValue(receipt),
    transitionTaskStatus: jest.fn().mockResolvedValue(receipt),
    updateOpportunityStage: jest.fn().mockResolvedValue(receipt),
    winOpportunityWithHandoff: jest.fn().mockResolvedValue(receipt),
  };
  const workspaceCacheService = {
    getOrRecompute: jest.fn().mockResolvedValue({
      flatWorkspaceMemberMaps: {
        idByUserId: { 'user-id': workspaceMember.id },
        byId: { [workspaceMember.id]: workspaceMember },
      },
    }),
  };
  const mcpInstructionBuilderService = {
    buildInstructions: jest.fn().mockResolvedValue('generic instructions'),
  };
  const protocolService = new McpProtocolService(
    toolRegistry as unknown as ToolRegistryService,
    userRoleService as never,
    new McpToolExecutorService(metricsService as never),
    apiKeyRoleService as never,
    {} as SkillService,
    mcpInstructionBuilderService as never,
    {} as WorkspaceManyOrAllFlatEntityMapsCacheService,
    workspaceCacheService as unknown as WorkspaceCacheService,
    { isTeamWorkspaceId: jest.fn().mockReturnValue(true) } as never,
    teamWorkspaceService as never,
    teamWorkspaceCommandService as never,
  );

  return {
    protocolService,
    teamWorkspaceCommandService,
    teamWorkspaceService,
    mcpInstructionBuilderService,
    toolRegistry,
    userRoleService,
    workspaceCacheService,
  };
};

const listTools = async (protocolService: McpProtocolService) =>
  (await protocolService.handleMCPCoreQuery(
    { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    {
      workspace,
      user,
      userId: 'user-id',
      userWorkspaceId,
      apiKey: undefined,
    },
  )) as ToolListResponse;

describe('McpProtocolService team workspace tools', () => {
  it('lists role-scoped team tools with correct read and write annotations', async () => {
    const { protocolService, toolRegistry } = createHarness('Sales');

    const response = await listTools(protocolService);
    const toolsByName = new Map(
      response.result.tools.map((tool) => [tool.name, tool]),
    );

    expect([...toolsByName.keys()].sort()).toEqual(
      [
        TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME,
        TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME,
        TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME,
        TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME,
        TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME,
        TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME,
      ].sort(),
    );
    expect(toolRegistry.getToolsByName).not.toHaveBeenCalled();

    expect(
      toolsByName.get(TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME)?.annotations,
    ).toEqual({
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    });
    expect(
      toolsByName.get(TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME)?.annotations,
    ).toEqual({
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    });
    expect(
      toolsByName.get(TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME)?.annotations,
    ).toEqual({
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    });
    expect(
      toolsByName.get(TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME)
        ?.annotations,
    ).toEqual({
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    });
    expect(
      toolsByName.get(TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME)
        ?.annotations,
    ).toEqual({
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    });
    expect(
      toolsByName.get(TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME)
        ?.annotations,
    ).toEqual({
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    });
  });

  it('hides Sales-only and all team tools from roles the services reject', async () => {
    const operationsResponse = await listTools(
      createHarness('Operations').protocolService,
    );
    const employeeResponse = await listTools(
      createHarness('Employee').protocolService,
    );
    const operationsNames = operationsResponse.result.tools.map(
      ({ name }) => name,
    );
    const employeeNames = employeeResponse.result.tools.map(({ name }) => name);

    expect(operationsNames).toContain(TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME);
    expect(operationsNames).toContain(TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME);
    expect(operationsNames).toContain(
      TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME,
    );
    expect(operationsNames).toContain(
      TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME,
    );
    expect(operationsNames).not.toContain(
      TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME,
    );
    expect(operationsNames).not.toContain(
      TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME,
    );
    expect(employeeNames).not.toContain(TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME);
    expect(employeeNames).not.toContain(TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME);
    expect(employeeNames).not.toContain(
      TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME,
    );
    expect(employeeNames).not.toContain(
      TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME,
    );
    expect(employeeNames).not.toContain(
      TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME,
    );
    expect(employeeNames).not.toContain(
      TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME,
    );
    expect(operationsNames).not.toContain(
      TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME,
    );
    expect(employeeNames).not.toContain(
      TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME,
    );
  });

  it('exposes assigned-work creation only to Admin and Team Automation', async () => {
    const adminTools = await listTools(createHarness('Admin').protocolService);

    expect(adminTools.result.tools.map(({ name }) => name)).toContain(
      TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME,
    );

    const { protocolService, teamWorkspaceCommandService } =
      createHarness('Sales');
    const apiKey = { id: 'api-key-id', name: 'Team Automation' };
    const input = {
      lane: 'OPERATIONS',
      assigneeId: '4cdf83c1-5987-4cb0-97a7-8f991855af91',
      title: 'Prepare the client delivery update',
      detail: 'Check the live campaign and record the verified update.',
      dueAt: '2026-08-28T09:00:00.000Z',
      client: 'acme',
      idempotencyKey: 'assigned-work-001',
    };
    const response = (await protocolService.handleMCPCoreQuery(
      {
        jsonrpc: '2.0',
        id: 31,
        method: 'tools/call',
        params: {
          name: TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME,
          arguments: input,
        },
      },
      { workspace, apiKey: apiKey as never },
    )) as ToolCallResponse;

    expect(response.result.isError).toBe(false);
    expect(teamWorkspaceCommandService.createAssignedWork).toHaveBeenCalledWith(
      {
        type: 'apiKey',
        workspace,
        apiKey,
      },
      input,
    );
  });

  it('passes the same authenticated context and validated payload to the command service', async () => {
    const { protocolService, teamWorkspaceCommandService } =
      createHarness('Sales');
    const input = {
      taskId: 'b5f78b5b-416b-4d83-81d8-7f0b6d8fd42e',
      expectedStatus: 'TODO',
      expectedVersion: '2026-08-26T00:00:00.000Z',
      evidence: 'Reviewed delivery evidence.',
      source: 'CRM update',
      idempotencyKey: 'complete-task-001',
    };

    const response = (await protocolService.handleMCPCoreQuery(
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME,
          arguments: input,
        },
      },
      {
        workspace,
        user,
        userId: 'user-id',
        userWorkspaceId,
        apiKey: undefined,
      },
    )) as ToolCallResponse;

    expect(response.result.isError).toBe(false);
    expect(
      teamWorkspaceCommandService.completeTaskWithEvidence,
    ).toHaveBeenCalledWith(userAuthContext, input);
  });

  it('keeps protocol creation and state transitions on the shared command boundary', async () => {
    const { protocolService, teamWorkspaceCommandService } =
      createHarness('Sales');
    const toolCalls = [
      {
        name: TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME,
        arguments: {
          kind: 'MEETING_PREP',
          lane: 'SALES',
          targetId: '734ba126-5751-49e5-ad81-a3ea254d8884',
          content: 'Prepare questions from the previous call.',
          evidence: 'Linked meeting record.',
          source: 'CRM calendar event',
          idempotencyKey: 'protocol-task-001',
        },
      },
      {
        name: TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME,
        arguments: {
          taskId: '734ba126-5751-49e5-ad81-a3ea254d8884',
          expectedStatus: 'TODO',
          expectedVersion: '2026-08-26T00:00:00.000Z',
          nextStatus: 'IN_PROGRESS',
          idempotencyKey: 'transition-task-001',
        },
      },
      {
        name: TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME,
        arguments: {
          opportunityId: '85dbbc38-479f-4c02-9089-7df23a795178',
          expectedStage: 'PROPOSAL',
          expectedVersion: '2026-08-26T00:00:00.000Z',
          nextStage: 'DECISION',
          idempotencyKey: 'opportunity-stage-001',
        },
      },
    ];

    const responses: ToolCallResponse[] = [];

    for (const [index, toolCall] of toolCalls.entries()) {
      responses.push(
        (await protocolService.handleMCPCoreQuery(
          {
            jsonrpc: '2.0',
            id: index + 10,
            method: 'tools/call',
            params: toolCall,
          },
          {
            workspace,
            user,
            userId: 'user-id',
            userWorkspaceId,
            apiKey: undefined,
          },
        )) as ToolCallResponse,
      );
    }

    expect(responses.every(({ result }) => !result.isError)).toBe(true);
    expect(teamWorkspaceCommandService.createProtocolTask).toHaveBeenCalledWith(
      userAuthContext,
      toolCalls[0].arguments,
    );
    expect(
      teamWorkspaceCommandService.transitionTaskStatus,
    ).toHaveBeenCalledWith(userAuthContext, toolCalls[1].arguments);
    expect(
      teamWorkspaceCommandService.updateOpportunityStage,
    ).toHaveBeenCalledWith(userAuthContext, toolCalls[2].arguments);
  });

  it('rejects a cross-lane snapshot before the snapshot service is called', async () => {
    const { protocolService, teamWorkspaceService } = createHarness('Sales');

    const response = (await protocolService.handleMCPCoreQuery(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME,
          arguments: { lane: 'operations' },
        },
      },
      {
        workspace,
        user,
        userId: 'user-id',
        userWorkspaceId,
        apiKey: undefined,
      },
    )) as ToolCallResponse;

    expect(response.result.isError).toBe(true);
    expect(teamWorkspaceService.getSnapshot).not.toHaveBeenCalled();
  });

  it('fails closed for reserved human automation and malformed mixed team roles', async () => {
    for (const roleInput of [
      'Team Automation',
      ['Sales', 'Employee'],
    ] as const) {
      const { mcpInstructionBuilderService, protocolService, toolRegistry } =
        createHarness(roleInput as string | string[]);
      const requestContext = {
        workspace,
        user,
        userId: user.id,
        userWorkspaceId,
        apiKey: undefined,
      };
      const listResponse = (await protocolService.handleMCPCoreQuery(
        { jsonrpc: '2.0', id: 20, method: 'tools/list' },
        requestContext,
      )) as ToolListResponse;
      const deniedResponse = (await protocolService.handleMCPCoreQuery(
        {
          jsonrpc: '2.0',
          id: 21,
          method: 'tools/call',
          params: {
            name: 'execute_tool',
            arguments: { toolName: 'unscoped_logic_function', input: {} },
          },
        },
        requestContext,
      )) as ToolErrorResponse;
      const initializeResponse = (await protocolService.handleMCPCoreQuery(
        { jsonrpc: '2.0', id: 22, method: 'initialize' },
        requestContext,
      )) as InitializeResponse;

      expect(listResponse.result.tools).toEqual([]);
      expect(deniedResponse.error.message).toBe('Unknown tool: execute_tool');
      expect(initializeResponse.result.instructions).not.toContain(
        'execute_tool',
      );
      expect(
        mcpInstructionBuilderService.buildInstructions,
      ).not.toHaveBeenCalled();
      expect(toolRegistry.getToolsByName).not.toHaveBeenCalled();
    }
  });

  it('fails closed when an authenticated user cannot be resolved to a workspace member', async () => {
    const {
      protocolService,
      mcpInstructionBuilderService,
      toolRegistry,
      workspaceCacheService,
    } = createHarness('Sales');

    workspaceCacheService.getOrRecompute.mockResolvedValue({
      flatWorkspaceMemberMaps: { idByUserId: {}, byId: {} },
    });

    const requestContext = {
      workspace,
      user,
      userId: user.id,
      userWorkspaceId,
      apiKey: undefined,
    };
    const listResponse = (await protocolService.handleMCPCoreQuery(
      { jsonrpc: '2.0', id: 23, method: 'tools/list' },
      requestContext,
    )) as ToolListResponse;
    const deniedResponse = (await protocolService.handleMCPCoreQuery(
      {
        jsonrpc: '2.0',
        id: 24,
        method: 'tools/call',
        params: {
          name: 'execute_tool',
          arguments: { toolName: 'unscoped_logic_function', input: {} },
        },
      },
      requestContext,
    )) as ToolErrorResponse;
    const initializeResponse = (await protocolService.handleMCPCoreQuery(
      { jsonrpc: '2.0', id: 25, method: 'initialize' },
      requestContext,
    )) as InitializeResponse;

    expect(listResponse.result.tools).toEqual([]);
    expect(deniedResponse.error.message).toBe('Unknown tool: execute_tool');
    expect(initializeResponse.result.instructions).toContain(
      'Use only the listed team_workspace_* tools',
    );
    expect(
      mcpInstructionBuilderService.buildInstructions,
    ).not.toHaveBeenCalled();
    expect(toolRegistry.getToolsByName).not.toHaveBeenCalled();
  });

  it('passes the authenticated Team Automation API key to the safe snapshot service', async () => {
    const { protocolService, teamWorkspaceService } = createHarness('Sales');
    const apiKey = { id: 'api-key-id', name: 'Team Automation' };

    const response = (await protocolService.handleMCPCoreQuery(
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME,
          arguments: { lane: 'operations' },
        },
      },
      {
        workspace,
        apiKey: apiKey as never,
      },
    )) as ToolCallResponse;

    expect(response.result.isError).toBe(false);
    expect(teamWorkspaceService.getSnapshotForAuthContext).toHaveBeenCalledWith(
      {
        lane: 'operations',
        authContext: {
          type: 'apiKey',
          workspace,
          apiKey,
        },
      },
    );
  });

  it('gives Team Automation an exact closed-world list and denies generic execution', async () => {
    const { protocolService, mcpInstructionBuilderService, toolRegistry } =
      createHarness('Sales');
    const apiKey = { id: 'api-key-id', name: 'Team Automation' };
    const requestContext = {
      workspace,
      apiKey: apiKey as never,
    };

    const listResponse = (await protocolService.handleMCPCoreQuery(
      { jsonrpc: '2.0', id: 5, method: 'tools/list' },
      requestContext,
    )) as ToolListResponse;
    const deniedResponse = (await protocolService.handleMCPCoreQuery(
      {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'execute_tool',
          arguments: { toolName: 'unscoped_logic_function', input: {} },
        },
      },
      requestContext,
    )) as ToolErrorResponse;
    const initializeResponse = (await protocolService.handleMCPCoreQuery(
      { jsonrpc: '2.0', id: 7, method: 'initialize' },
      requestContext,
    )) as InitializeResponse;

    expect(listResponse.result.tools.map(({ name }) => name).sort()).toEqual(
      [
        TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME,
        TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME,
        TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME,
        TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME,
        TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME,
        TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME,
        TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME,
      ].sort(),
    );
    expect(deniedResponse.error.message).toBe('Unknown tool: execute_tool');
    expect(initializeResponse.result.instructions).toContain(
      'Use only the listed team_workspace_* tools',
    );
    expect(initializeResponse.result.instructions).not.toContain(
      'execute_tool',
    );
    expect(
      mcpInstructionBuilderService.buildInstructions,
    ).not.toHaveBeenCalled();
    expect(toolRegistry.getToolsByName).not.toHaveBeenCalled();
  });
});
