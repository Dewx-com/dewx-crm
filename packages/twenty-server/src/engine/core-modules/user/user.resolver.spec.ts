import { withWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { UserResolver } from './user.resolver';
import { UserService } from './services/user.service';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

// Exercise the real resolver and service methods with their persistence boundaries mocked.
describe('workspace member bootstrap', () => {
  const workspace = {
    id: 'workspace',
    activationStatus: WorkspaceActivationStatus.ACTIVE,
  };
  const valid = { id: 'member', userId: 'user' };
  const membership = { id: 'membership', userId: 'user' };
  const roles = [{ id: 'role' }];
  let resolver: UserResolver;
  let mocks: any;

  beforeEach(() => {
    mocks = {
      userService: {
        loadWorkspaceMembers: jest
          .fn()
          .mockResolvedValue([valid, { id: 'orphan', userId: 'missing' }]),
        loadDeletedWorkspaceMembersOnly: jest.fn().mockResolvedValue([]),
      },
      userWorkspaceRepository: {
        find: jest.fn().mockResolvedValue([membership]),
      },
      userRoleService: {
        getRolesByUserWorkspaces: jest
          .fn()
          .mockResolvedValue(new Map([['membership', roles]])),
      },
      workspaceMemberTranspiler: {
        toWorkspaceMemberDtos: jest.fn((args) => args),
        toDeletedWorkspaceMemberDtos: jest.fn((args) => args),
      },
    };
    resolver = Object.assign(Object.create(UserResolver.prototype), mocks);
  });

  it('keeps valid members when another member has no core membership', async () => {
    expect(
      await resolver.workspaceMembers({} as any, workspace as any),
    ).toEqual([
      {
        userWorkspace: membership,
        userWorkspaceRoles: roles,
        workspaceMemberEntity: valid,
      },
    ]);
    expect(mocks.userService.loadWorkspaceMembers).toHaveBeenCalledWith(
      workspace,
      false,
      true,
    );
  });

  it.each([undefined, []])(
    'omits members with absent or empty roles (%s)',
    async (missingRoles) => {
      mocks.userRoleService.getRolesByUserWorkspaces.mockResolvedValue(
        new Map([['membership', missingRoles]]),
      );
      expect(
        await resolver.workspaceMembers({} as any, workspace as any),
      ).toEqual([]);
    },
  );

  it('honors an empty permitted member list', async () => {
    mocks.userService.loadWorkspaceMembers.mockResolvedValue([]);
    expect(
      await resolver.workspaceMembers({} as any, workspace as any),
    ).toEqual([]);
  });

  it('applies request permissions to the deleted-member list too', async () => {
    expect(
      await resolver.deletedWorkspaceMembers({} as any, workspace as any),
    ).toEqual([]);
    expect(
      mocks.userService.loadDeletedWorkspaceMembersOnly,
    ).toHaveBeenCalledWith(workspace, true);
  });

  it('does not load members before a workspace exists', async () => {
    expect(await resolver.workspaceMembers({} as any, undefined)).toEqual([]);
    expect(mocks.userService.loadWorkspaceMembers).not.toHaveBeenCalled();
  });

  it.each(['loadWorkspaceMembers', 'loadDeletedWorkspaceMembersOnly'])(
    '%s uses the request context and enables permission enforcement',
    async (method) => {
      const repository = { find: jest.fn().mockResolvedValue([]) };
      const manager = {
        getRepository: jest.fn().mockResolvedValue(repository),
        executeInWorkspaceContext: jest.fn((callback, _authContext?: unknown) =>
          withWorkspaceContext(
            {
              authContext: { type: 'user', userWorkspaceId: 'caller' },
              userWorkspaceRoleMap: { caller: 'caller-role' },
              apiKeyRoleMap: {},
            } as any,
            callback,
          ),
        ),
      };
      const service = Object.assign(Object.create(UserService.prototype), {
        globalWorkspaceOrmManager: manager,
        refreshWorkspaceIfPendingOrOngoingCreation: jest
          .fn()
          .mockResolvedValue(workspace),
      });
      if (method === 'loadWorkspaceMembers')
        await service.loadWorkspaceMembers(workspace, false, true);
      else await service.loadDeletedWorkspaceMembersOnly(workspace, true);
      expect(manager.getRepository).toHaveBeenCalledWith(
        workspace.id,
        'workspaceMember',
        undefined,
      );
      expect(
        manager.executeInWorkspaceContext.mock.calls[0][1],
      ).toBeUndefined();
    },
  );
});
