import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { type ToolSet, zodSchema } from 'ai';
import { isDefined } from 'twenty-shared/utils';
import { type ActorMetadata, FieldActorSource } from 'twenty-shared/types';

import { MCP_CLOSED_WORLD_WRITE_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-closed-world-write-tool-annotations.const';
import { JSON_RPC_ERROR_CODE } from 'src/engine/api/mcp/constants/json-rpc-error-code.const';
import { MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-closed-world-read-only-tool-annotations.const';
import { MCP_EXCLUDED_TOOL_NAMES } from 'src/engine/api/mcp/constants/mcp-excluded-tool-names.const';
import { MCP_EXECUTE_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-execute-tool-annotations.const';
import { MCP_OPEN_WORLD_READ_ONLY_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-open-world-read-only-tool-annotations.const';
import { MCP_PROTOCOL_VERSION } from 'src/engine/api/mcp/constants/mcp-protocol-version.const';
import { MCP_SERVER_INFO } from 'src/engine/api/mcp/constants/mcp-server-info.const';
import { JsonRpc } from 'src/engine/api/mcp/dtos/json-rpc';
import { McpInstructionBuilderService } from 'src/engine/api/mcp/services/mcp-instruction-builder.service';
import { McpToolExecutorService } from 'src/engine/api/mcp/services/mcp-tool-executor.service';
import {
  createListObjectMetadataNamesTool,
  LIST_OBJECT_METADATA_NAMES_TOOL_NAME,
  listObjectMetadataNamesInputSchema,
} from 'src/engine/api/mcp/tools/list-object-metadata-names.tool';
import {
  createListSkillsTool,
  LIST_SKILLS_TOOL_NAME,
  listSkillsInputSchema,
} from 'src/engine/api/mcp/tools/list-skills.tool';
import {
  createTeamWorkspaceAssignedWorkTool,
  createTeamWorkspaceCompleteTaskTool,
  createTeamWorkspaceProtocolTaskTool,
  createTeamWorkspaceSnapshotTool,
  createTeamWorkspaceTransitionTaskStatusTool,
  createTeamWorkspaceUpdateOpportunityStageTool,
  createTeamWorkspaceWinOpportunityTool,
  TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME,
  TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME,
  TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME,
  TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME,
  TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME,
  TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME,
  TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME,
} from 'src/engine/api/mcp/tools/team-workspace.tool';
import { type McpToolAnnotations } from 'src/engine/api/mcp/types/mcp-tool-annotations.type';
import { wrapJsonRpcResponse } from 'src/engine/api/mcp/utils/wrap-jsonrpc-response.util';
import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import {
  type UserWorkspaceAuthContext,
  type WorkspaceAuthContext,
} from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildApiKeyAuthContext } from 'src/engine/core-modules/auth/utils/build-api-key-auth-context.util';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { TeamWorkspaceLane } from 'src/engine/core-modules/team-workspace/enums/team-workspace-lane.enum';
import { TEAM_WORKSPACE_ROLE_LABEL } from 'src/engine/core-modules/team-workspace/team-workspace.constants';
import { TeamWorkspaceService } from 'src/engine/core-modules/team-workspace/team-workspace.service';
import { COMMON_PRELOAD_TOOLS } from 'src/engine/core-modules/tool-provider/constants/common-preload-tools.const';
import { ToolRegistryService } from 'src/engine/core-modules/tool-provider/services/tool-registry.service';
import {
  createLearnToolsTool,
  LEARN_TOOLS_TOOL_NAME,
  learnToolsInputSchema,
} from 'src/engine/core-modules/tool-provider/tools';
import {
  createExecuteToolTool,
  EXECUTE_TOOL_TOOL_NAME,
  executeToolInputSchema,
} from 'src/engine/core-modules/tool-provider/tools/execute-tool.tool';
import {
  createGetToolCatalogTool,
  GET_TOOL_CATALOG_TOOL_NAME,
  getToolCatalogInputSchema,
} from 'src/engine/core-modules/tool-provider/tools/get-tool-catalog.tool';
import {
  createLoadSkillTool,
  LOAD_SKILL_TOOL_NAME,
  loadSkillInputSchema,
} from 'src/engine/core-modules/tool-provider/tools/load-skill.tool';
import { type UserEntity } from 'src/engine/core-modules/user/user.entity';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { SkillService } from 'src/engine/metadata-modules/skill/skill.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { TeamWorkspaceCommandService } from 'src/modules/team-workspace/commands/team-workspace-command.service';

type McpAnnotatedTool = ToolSet[string] & {
  annotations: McpToolAnnotations;
};

type TeamWorkspaceMcpAccess = {
  allowedLanes: readonly TeamWorkspaceLane[];
  canCompleteTask: boolean;
  canCreateAssignedWork: boolean;
  canCreateProtocolTask: boolean;
  canTransitionTaskStatus: boolean;
  canUpdateOpportunityStage: boolean;
  canWinOpportunity: boolean;
};

type TeamWorkspaceMcpResolution =
  | { disposition: 'granted'; access: TeamWorkspaceMcpAccess }
  | { disposition: 'denied' }
  | { disposition: 'ordinary' };

const RESERVED_TEAM_WORKSPACE_ROLE_LABELS = new Set<string>(
  Object.values(TEAM_WORKSPACE_ROLE_LABEL),
);

const MCP_PRELOADED_TOOL_ANNOTATIONS: Record<string, McpToolAnnotations> = {
  search_help_center: MCP_OPEN_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
};

const TEAM_WORKSPACE_MCP_INSTRUCTIONS = [
  'You are connected to the Prospect Engine team workspace.',
  'Use only the listed team_workspace_* tools. Role, lane, ownership, expected state, and record version are enforced by the server.',
  'Raw call transcripts and confidential source payloads are unavailable. Use only the bounded coaching and evidence projections returned by team_workspace_snapshot.',
  'Every write requires a stable idempotency key. After a transport timeout, retry the exact same payload and key.',
].join('\n');

const annotatePreloadedMcpTools = (toolSet: ToolSet): ToolSet =>
  Object.fromEntries(
    Object.entries(toolSet).map(([name, toolDefinition]) => {
      const annotations = MCP_PRELOADED_TOOL_ANNOTATIONS[name];

      if (!isDefined(annotations)) {
        throw new Error(`Missing MCP annotations for preloaded tool "${name}"`);
      }

      return [
        name,
        {
          ...toolDefinition,
          annotations,
        } as McpAnnotatedTool,
      ];
    }),
  );

@Injectable()
export class McpProtocolService {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly userRoleService: UserRoleService,
    private readonly mcpToolExecutorService: McpToolExecutorService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
    private readonly skillService: SkillService,
    private readonly mcpInstructionBuilderService: McpInstructionBuilderService,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    private readonly teamWorkspaceService: TeamWorkspaceService,
    private readonly teamWorkspaceCommandService: TeamWorkspaceCommandService,
  ) {}

  async handleInitialize(
    requestId: string | number,
    workspaceId: string,
    isClosedWorldTeamWorkspace = false,
  ) {
    const instructions = isClosedWorldTeamWorkspace
      ? TEAM_WORKSPACE_MCP_INSTRUCTIONS
      : await this.mcpInstructionBuilderService.buildInstructions(workspaceId);

    return wrapJsonRpcResponse(requestId, {
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: MCP_SERVER_INFO,
        instructions,
      },
    });
  }

  async getRoleId(
    workspaceId: string,
    userWorkspaceId?: string,
    apiKey?: FlatApiKey,
  ) {
    if (isDefined(apiKey)) {
      return this.apiKeyRoleService.getRoleIdForApiKeyId(
        apiKey.id,
        workspaceId,
      );
    }

    if (!userWorkspaceId) {
      throw new HttpException(
        'User workspace ID missing',
        HttpStatus.FORBIDDEN,
      );
    }

    const roleId = await this.userRoleService.getRoleIdForUserWorkspace({
      workspaceId,
      userWorkspaceId,
    });

    if (!roleId) {
      throw new HttpException('Role ID missing', HttpStatus.FORBIDDEN);
    }

    return roleId;
  }

  private async buildActorContext(
    workspaceId: string,
    userId?: string,
    apiKey?: FlatApiKey,
  ): Promise<ActorMetadata> {
    let actorContext: ActorMetadata = {
      source: FieldActorSource.AGENT,
      workspaceMemberId: null,
      name: 'Agent',
      context: {},
    };

    if (isDefined(apiKey)) {
      actorContext = {
        source: FieldActorSource.AGENT,
        workspaceMemberId: null,
        name: apiKey.name,
        context: {},
      };
    } else if (isDefined(userId)) {
      const { flatWorkspaceMemberMaps } =
        await this.workspaceCacheService.getOrRecompute(workspaceId, [
          'flatWorkspaceMemberMaps',
        ]);
      const workspaceMemberId = flatWorkspaceMemberMaps.idByUserId[userId];
      const workspaceMember = isDefined(workspaceMemberId)
        ? flatWorkspaceMemberMaps.byId[workspaceMemberId]
        : undefined;

      if (isDefined(workspaceMember)) {
        actorContext = {
          source: FieldActorSource.AGENT,
          workspaceMemberId: workspaceMember.id,
          name:
            `${workspaceMember.name?.firstName ?? ''} ${workspaceMember.name?.lastName ?? ''}`.trim() ||
            'Agent',
          context: {},
        };
      }
    }

    return actorContext;
  }

  private async buildMcpWorkspaceAuthContext({
    workspace,
    user,
    userWorkspaceId,
    apiKey,
  }: {
    workspace: FlatWorkspace;
    user?: UserEntity;
    userWorkspaceId?: string;
    apiKey?: FlatApiKey;
  }): Promise<WorkspaceAuthContext | undefined> {
    if (isDefined(apiKey)) {
      return buildApiKeyAuthContext({ workspace, apiKey });
    }

    if (!isDefined(user) && !isDefined(userWorkspaceId)) {
      return undefined;
    }

    if (!isDefined(user) || !isDefined(userWorkspaceId)) {
      return undefined;
    }

    const { flatWorkspaceMemberMaps } =
      await this.workspaceCacheService.getOrRecompute(workspace.id, [
        'flatWorkspaceMemberMaps',
      ]);
    const workspaceMemberId = flatWorkspaceMemberMaps.idByUserId[user.id];
    const workspaceMember = isDefined(workspaceMemberId)
      ? flatWorkspaceMemberMaps.byId[workspaceMemberId]
      : undefined;

    if (!isDefined(workspaceMemberId) || !isDefined(workspaceMember)) {
      return undefined;
    }

    return {
      type: 'user',
      workspace,
      userWorkspaceId,
      user: user as unknown as UserWorkspaceAuthContext['user'],
      workspaceMemberId,
      workspaceMember:
        workspaceMember as unknown as UserWorkspaceAuthContext['workspaceMember'],
    };
  }

  private async buildMcpToolSet(
    workspace: FlatWorkspace,
    roleId: string,
    options?: {
      authContext?: WorkspaceAuthContext;
      userId?: string;
      userWorkspaceId?: string;
      apiKey?: FlatApiKey;
      shouldDenyGenericTools?: boolean;
    },
  ): Promise<ToolSet> {
    if (options?.shouldDenyGenericTools === true) {
      return {};
    }

    if (isDefined(options?.authContext)) {
      const resolution = await this.resolveTeamWorkspaceMcpAccess(
        options.authContext,
      );

      if (resolution.disposition === 'granted') {
        return this.buildTeamWorkspaceToolSet(
          options.authContext,
          resolution.access,
        );
      }

      if (resolution.disposition === 'denied') {
        return {};
      }
    }

    const actorContext = await this.buildActorContext(
      workspace.id,
      options?.userId,
      options?.apiKey,
    );

    const toolContext = {
      workspaceId: workspace.id,
      roleId,
      authContext: options?.authContext,
      userId: options?.userId,
      userWorkspaceId: options?.userWorkspaceId,
      actorContext,
    };

    const preloadedTools = await this.toolRegistry.getToolsByName(
      COMMON_PRELOAD_TOOLS,
      toolContext,
    );

    return {
      ...annotatePreloadedMcpTools(preloadedTools),
      [GET_TOOL_CATALOG_TOOL_NAME]: {
        ...createGetToolCatalogTool(this.toolRegistry, workspace.id, roleId, {
          userId: options?.userId,
          userWorkspaceId: options?.userWorkspaceId,
          excludeTools: MCP_EXCLUDED_TOOL_NAMES,
        }),
        inputSchema: zodSchema(getToolCatalogInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [EXECUTE_TOOL_TOOL_NAME]: {
        ...createExecuteToolTool(this.toolRegistry, toolContext, {
          isToolAllowed: (toolName) => !MCP_EXCLUDED_TOOL_NAMES.has(toolName),
        }),
        inputSchema: executeToolInputSchema,
        annotations: MCP_EXECUTE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LOAD_SKILL_TOOL_NAME]: {
        ...createLoadSkillTool(
          (names) =>
            this.skillService.findFlatSkillsByNames(names, workspace.id),
          async () => {
            const allSkills = await this.skillService.findAllFlatSkills(
              workspace.id,
            );

            return allSkills.map((skill) => skill.name);
          },
        ),
        inputSchema: zodSchema(loadSkillInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LIST_OBJECT_METADATA_NAMES_TOOL_NAME]: {
        ...createListObjectMetadataNamesTool(
          this.flatEntityMapsCacheService,
          workspace.id,
        ),
        inputSchema: zodSchema(listObjectMetadataNamesInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LIST_SKILLS_TOOL_NAME]: {
        ...createListSkillsTool(this.skillService, workspace.id),
        inputSchema: zodSchema(listSkillsInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LEARN_TOOLS_TOOL_NAME]: {
        ...createLearnToolsTool(this.toolRegistry, toolContext, {
          isToolAllowed: (toolName) => !MCP_EXCLUDED_TOOL_NAMES.has(toolName),
        }),
        inputSchema: zodSchema(learnToolsInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
    };
  }

  private buildTeamWorkspaceToolSet(
    authContext: WorkspaceAuthContext,
    access: TeamWorkspaceMcpAccess,
  ): ToolSet {
    const tools: ToolSet = {
      [TEAM_WORKSPACE_SNAPSHOT_TOOL_NAME]: {
        ...createTeamWorkspaceSnapshotTool({
          allowedLanes: access.allowedLanes,
          authContext,
          teamWorkspaceService: this.teamWorkspaceService,
        }),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
    };

    if (access.canCreateAssignedWork) {
      tools[TEAM_WORKSPACE_CREATE_ASSIGNED_WORK_TOOL_NAME] = {
        ...createTeamWorkspaceAssignedWorkTool({
          authContext,
          teamWorkspaceCommandService: this.teamWorkspaceCommandService,
        }),
        annotations: MCP_CLOSED_WORLD_WRITE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool;
    }

    if (access.canCompleteTask) {
      tools[TEAM_WORKSPACE_COMPLETE_TASK_TOOL_NAME] = {
        ...createTeamWorkspaceCompleteTaskTool({
          authContext,
          teamWorkspaceCommandService: this.teamWorkspaceCommandService,
        }),
        annotations: MCP_CLOSED_WORLD_WRITE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool;
    }

    if (access.canWinOpportunity) {
      tools[TEAM_WORKSPACE_WIN_OPPORTUNITY_TOOL_NAME] = {
        ...createTeamWorkspaceWinOpportunityTool({
          authContext,
          teamWorkspaceCommandService: this.teamWorkspaceCommandService,
        }),
        annotations: MCP_CLOSED_WORLD_WRITE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool;
    }

    if (access.canCreateProtocolTask) {
      tools[TEAM_WORKSPACE_CREATE_PROTOCOL_TASK_TOOL_NAME] = {
        ...createTeamWorkspaceProtocolTaskTool({
          authContext,
          teamWorkspaceCommandService: this.teamWorkspaceCommandService,
        }),
        annotations: MCP_CLOSED_WORLD_WRITE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool;
    }

    if (access.canTransitionTaskStatus) {
      tools[TEAM_WORKSPACE_TRANSITION_TASK_STATUS_TOOL_NAME] = {
        ...createTeamWorkspaceTransitionTaskStatusTool({
          authContext,
          teamWorkspaceCommandService: this.teamWorkspaceCommandService,
        }),
        annotations: MCP_CLOSED_WORLD_WRITE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool;
    }

    if (access.canUpdateOpportunityStage) {
      tools[TEAM_WORKSPACE_UPDATE_OPPORTUNITY_STAGE_TOOL_NAME] = {
        ...createTeamWorkspaceUpdateOpportunityStageTool({
          authContext,
          teamWorkspaceCommandService: this.teamWorkspaceCommandService,
        }),
        annotations: MCP_CLOSED_WORLD_WRITE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool;
    }

    return tools;
  }

  private async resolveTeamWorkspaceMcpAccess(
    authContext: WorkspaceAuthContext,
  ): Promise<TeamWorkspaceMcpResolution> {
    if (
      !this.workspaceDomainsService.isTeamWorkspaceId(authContext.workspace.id)
    ) {
      return { disposition: 'ordinary' };
    }

    try {
      if (authContext.type === 'apiKey') {
        const role = await this.apiKeyRoleService.getRoleDtoByApiKeyId({
          apiKeyId: authContext.apiKey.id,
          workspaceId: authContext.workspace.id,
        });

        if (role.label === TEAM_WORKSPACE_ROLE_LABEL.automation && role.id) {
          return {
            disposition: 'granted',
            access: {
              allowedLanes: [
                TeamWorkspaceLane.SALES,
                TeamWorkspaceLane.OPERATIONS,
              ],
              canCompleteTask: true,
              canCreateAssignedWork: true,
              canCreateProtocolTask: true,
              canTransitionTaskStatus: true,
              canUpdateOpportunityStage: true,
              canWinOpportunity: true,
            },
          };
        }

        return RESERVED_TEAM_WORKSPACE_ROLE_LABELS.has(role.label)
          ? { disposition: 'denied' }
          : { disposition: 'ordinary' };
      }

      if (authContext.type !== 'user') {
        return { disposition: 'ordinary' };
      }

      const rolesByUserWorkspace =
        await this.userRoleService.getRolesByUserWorkspaces({
          userWorkspaceIds: [authContext.userWorkspaceId],
          workspaceId: authContext.workspace.id,
        });
      const roles = rolesByUserWorkspace.get(authContext.userWorkspaceId) ?? [];
      const hasReservedTeamRole = roles.some((role) =>
        RESERVED_TEAM_WORKSPACE_ROLE_LABELS.has(role.label),
      );

      if (roles.length !== 1 || !roles[0].id) {
        return roles.length === 0 || hasReservedTeamRole
          ? { disposition: 'denied' }
          : { disposition: 'ordinary' };
      }

      switch (roles[0].label) {
        case TEAM_WORKSPACE_ROLE_LABEL.sales:
          return {
            disposition: 'granted',
            access: {
              allowedLanes: [TeamWorkspaceLane.SALES],
              canCompleteTask: true,
              canCreateAssignedWork: false,
              canCreateProtocolTask: true,
              canTransitionTaskStatus: true,
              canUpdateOpportunityStage: true,
              canWinOpportunity: true,
            },
          };
        case TEAM_WORKSPACE_ROLE_LABEL.operations:
          return {
            disposition: 'granted',
            access: {
              allowedLanes: [TeamWorkspaceLane.OPERATIONS],
              canCompleteTask: true,
              canCreateAssignedWork: false,
              canCreateProtocolTask: true,
              canTransitionTaskStatus: true,
              canUpdateOpportunityStage: false,
              canWinOpportunity: false,
            },
          };
        case TEAM_WORKSPACE_ROLE_LABEL.admin:
          return {
            disposition: 'granted',
            access: {
              allowedLanes: [
                TeamWorkspaceLane.SALES,
                TeamWorkspaceLane.OPERATIONS,
              ],
              canCompleteTask: true,
              canCreateAssignedWork: true,
              canCreateProtocolTask: true,
              canTransitionTaskStatus: true,
              canUpdateOpportunityStage: true,
              canWinOpportunity: true,
            },
          };
        case TEAM_WORKSPACE_ROLE_LABEL.automation:
          return { disposition: 'denied' };
        default:
          return { disposition: 'ordinary' };
      }
    } catch {
      return { disposition: 'denied' };
    }
  }

  // Returns null for JSON-RPC notifications (no id), which require no response body
  async handleMCPCoreQuery(
    { id, method, params }: JsonRpc,
    {
      workspace,
      user,
      userId,
      userWorkspaceId,
      apiKey,
    }: {
      workspace: FlatWorkspace;
      user?: UserEntity;
      userId?: string;
      userWorkspaceId?: string;
      apiKey: FlatApiKey | undefined;
    },
    sseWriter?: (data: Record<string, unknown>) => void,
  ): Promise<Record<string, unknown> | null> {
    try {
      // JSON-RPC notifications have no id and expect no response
      if (!isDefined(id)) {
        return null;
      }

      if (method === 'initialize') {
        const initializeAuthContext = await this.buildMcpWorkspaceAuthContext({
          workspace,
          user,
          userWorkspaceId,
          apiKey,
        });
        const teamWorkspaceResolution = isDefined(initializeAuthContext)
          ? await this.resolveTeamWorkspaceMcpAccess(initializeAuthContext)
          : { disposition: 'ordinary' as const };
        const hasUnresolvedTeamUser =
          !isDefined(initializeAuthContext) &&
          this.workspaceDomainsService.isTeamWorkspaceId(workspace.id) &&
          (isDefined(user) || isDefined(userWorkspaceId));

        return this.handleInitialize(
          id,
          workspace.id,
          hasUnresolvedTeamUser ||
            teamWorkspaceResolution.disposition !== 'ordinary',
        );
      }

      if (method === 'ping') {
        return wrapJsonRpcResponse(id, { result: {} });
      }

      if (method === 'prompts/list') {
        return wrapJsonRpcResponse(id, {
          result: { prompts: [] },
        });
      }

      if (method === 'resources/list') {
        return wrapJsonRpcResponse(id, {
          result: { resources: [] },
        });
      }

      if (method !== 'tools/list' && method !== 'tools/call') {
        return wrapJsonRpcResponse(id, {
          error: {
            code: JSON_RPC_ERROR_CODE.METHOD_NOT_FOUND,
            message: `Method '${method}' not found`,
          },
        });
      }

      const roleId = await this.getRoleId(
        workspace.id,
        userWorkspaceId,
        apiKey,
      );

      const authContext = await this.buildMcpWorkspaceAuthContext({
        workspace,
        user,
        userWorkspaceId,
        apiKey,
      });
      const hasUnresolvedTeamUser =
        !isDefined(authContext) &&
        this.workspaceDomainsService.isTeamWorkspaceId(workspace.id) &&
        (isDefined(user) || isDefined(userWorkspaceId));

      const toolSet = await this.buildMcpToolSet(workspace, roleId, {
        authContext,
        userId,
        userWorkspaceId,
        apiKey,
        shouldDenyGenericTools: hasUnresolvedTeamUser,
      });

      if (method === 'tools/call') {
        if (!params) {
          return wrapJsonRpcResponse(id, {
            error: {
              code: JSON_RPC_ERROR_CODE.INVALID_PARAMS,
              message: 'tools/call requires params with name and arguments',
            },
          });
        }

        return await this.mcpToolExecutorService.handleToolCall(
          id,
          toolSet,
          params,
          sseWriter,
        );
      }

      return this.mcpToolExecutorService.handleToolsListing(id, toolSet);
    } catch (error) {
      if (error instanceof HttpException) {
        return wrapJsonRpcResponse(id ?? 0, {
          error: {
            code: JSON_RPC_ERROR_CODE.SERVER_ERROR,
            message: error.message || 'Request failed',
          },
        });
      }

      return wrapJsonRpcResponse(id ?? 0, {
        error: {
          code: JSON_RPC_ERROR_CODE.INTERNAL_ERROR,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
      });
    }
  }
}
