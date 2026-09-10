import { ImpersonationAuthorizationService } from 'src/engine/core-modules/impersonation/services/impersonation-authorization.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

const member = (userId: string, workspaceId = 'customer') =>
  ({
    id: `${workspaceId}-${userId}`,
    userId,
    user: { id: userId, canImpersonate: true },
    workspace: {
      id: workspaceId,
      primaryOwnerUserId: 'owner',
      allowImpersonation: true,
    },
  }) as UserWorkspaceEntity;

const service = () =>
  new ImpersonationAuthorizationService(
    {
      userHasWorkspaceSettingPermission: jest.fn().mockResolvedValue(true),
    } as unknown as PermissionsService,
    { get: () => 'development' } as unknown as TwentyConfigService,
  );

describe('customer owner impersonation', () => {
  it.each(['customer', 'support-account'])(
    'denies acting as the owner from %s even with native impersonation permission',
    async (workspaceId) => {
      const result = await service().checkImpersonationAuthorization(
        member('administrator', workspaceId),
        member('owner'),
      );
      expect(result.allowed).toBe(false);
    },
  );

  it('rechecks when a formerly ordinary member becomes the owner', async () => {
    const authorization = service();
    const target = member('next-owner');
    expect(
      (
        await authorization.checkImpersonationAuthorization(
          member('administrator'),
          target,
        )
      ).allowed,
    ).toBe(true);
    target.workspace.primaryOwnerUserId = target.userId;
    expect(
      (
        await authorization.checkImpersonationAuthorization(
          member('administrator'),
          target,
        )
      ).allowed,
    ).toBe(false);
  });

  it('preserves native authorization for legacy accounts without a recorded owner', async () => {
    const target = member('owner');
    target.workspace.primaryOwnerUserId = null;
    expect(
      (
        await service().checkImpersonationAuthorization(
          member('administrator'),
          target,
        )
      ).allowed,
    ).toBe(true);
  });
});
