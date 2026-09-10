import { PermissionsExceptionCode } from 'src/engine/metadata-modules/permissions/permissions.exception';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

describe('account-scoped team role assignment', () => {
  const memberships = [
    { id: 'member-a', workspaceId: 'account-a' },
    { id: 'member-b', workspaceId: 'account-b' },
  ];
  const createMany = jest.fn();
  let service: UserRoleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = Object.assign(Object.create(UserRoleService.prototype), {
      userWorkspaceRepository: {
        find: async ({
          where,
        }: {
          where: { id: { value: string[] }; workspaceId?: string };
        }) =>
          memberships.filter(
            (membership) =>
              where.id.value.includes(membership.id) &&
              (where.workspaceId === undefined ||
                membership.workspaceId === where.workspaceId),
          ),
      },
      getRolesByUserWorkspaces: async () => new Map(),
      roleTargetService: { createMany },
    });
  });

  it.each([['member-b'], ['member-a', 'member-b'], ['missing-member']])(
    'rejects members outside the selected account before assigning any roles: %j',
    async (...userWorkspaceIds) => {
      await expect(
        service.assignRoleToManyUserWorkspace({
          workspaceId: 'account-a',
          userWorkspaceIds,
          roleId: 'role-a',
        }),
      ).rejects.toMatchObject({
        code: PermissionsExceptionCode.USER_WORKSPACE_NOT_FOUND,
      });
      expect(createMany).not.toHaveBeenCalled();
    },
  );

  it('assigns a role to an existing member of the selected account', async () => {
    await service.assignRoleToManyUserWorkspace({
      workspaceId: 'account-a',
      userWorkspaceIds: ['member-a'],
      roleId: 'role-a',
    });
    expect(createMany).toHaveBeenCalledWith({
      workspaceId: 'account-a',
      createRoleTargetInputs: [
        {
          roleId: 'role-a',
          targetId: 'member-a',
          targetMetadataForeignKey: 'userWorkspaceId',
        },
      ],
    });
  });

  it('preserves the self-role-change refusal', async () => {
    await expect(
      service.assignRoleToManyUserWorkspace({
        workspaceId: 'account-a',
        userWorkspaceIds: ['member-a'],
        roleId: 'role-a',
        actingUserWorkspaceId: 'member-a',
      }),
    ).rejects.toThrow();
    expect(createMany).not.toHaveBeenCalled();
  });
});
