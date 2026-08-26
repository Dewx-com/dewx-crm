import { AppTokenEntity } from 'src/engine/core-modules/app-token/app-token.entity';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

import { AuthService } from './auth.service';

describe('AuthService social SSO team workspace routing', () => {
  const workspace = {
    id: '22222222-2222-4222-8222-222222222222',
    subdomain: 'app',
    customDomain: null,
    isCustomDomainEnabled: false,
  } as WorkspaceEntity;

  const createHarness = ({
    hasPendingLaneInvitation,
    isAcceptedLaneMember,
  }: {
    hasPendingLaneInvitation: boolean;
    isAcceptedLaneMember: boolean;
  }) => {
    const service = Object.create(AuthService.prototype) as AuthService;
    const invitation = hasPendingLaneInvitation
      ? ({ context: { roleId: 'invited-role-id' } } as AppTokenEntity)
      : undefined;
    const workspaceInvitationService = {
      isTeamWorkspaceLaneInvitation: jest
        .fn()
        .mockResolvedValue(hasPendingLaneInvitation),
      isTeamWorkspaceLaneMember: jest
        .fn()
        .mockResolvedValue(isAcceptedLaneMember),
    };

    Object.assign(service, {
      guardRedirectService: {
        getRedirectErrorUrlAndCaptureExceptions: jest.fn(),
      },
      loginTokenService: {
        generateLoginToken: jest.fn().mockResolvedValue({
          token: 'login-token',
        }),
      },
      userService: {
        findUserByEmailWithWorkspaces: jest.fn().mockResolvedValue(undefined),
      },
      workspaceInvitationService,
    });

    jest
      .spyOn(service, 'findWorkspaceForSignInUp')
      .mockResolvedValue(workspace);
    jest
      .spyOn(service, 'findInvitationForSignInUp')
      .mockResolvedValue(invitation);
    jest.spyOn(service, 'checkAccessForSignIn').mockResolvedValue(undefined);
    jest.spyOn(service, 'signInUp').mockResolvedValue({
      user: {
        id: 'user-id',
        email: 'sales.user@example.com',
      } as UserEntity,
      workspace,
    });
    jest
      .spyOn(service, 'createSSOConnectedAccountIfFeatureFlagIsOn')
      .mockResolvedValue(undefined);
    const computeRedirectURI = jest
      .spyOn(service, 'computeRedirectURI')
      .mockReturnValue('https://team.prospectengine.com/verify');

    return { computeRedirectURI, service, workspaceInvitationService };
  };

  it.each([AuthProviderEnum.Google, AuthProviderEnum.Microsoft] as const)(
    'keeps the %s callback on the team alias for an accepted lane member',
    async (authProvider) => {
      const { computeRedirectURI, service } = createHarness({
        hasPendingLaneInvitation: false,
        isAcceptedLaneMember: true,
      });

      await service.signInUpWithSocialSSO(
        {
          action: 'join-workspace',
          email: 'sales.user@example.com',
          firstName: 'Sales',
          lastName: 'User',
          picture: null,
          workspaceId: workspace.id,
        },
        authProvider,
      );

      expect(computeRedirectURI).toHaveBeenCalledWith(
        expect.objectContaining({ useTeamWorkspaceDomainAlias: true }),
      );
    },
  );

  it('uses a validated pending invitation when the accepted-member lookup has not resolved yet', async () => {
    const { computeRedirectURI, service } = createHarness({
      hasPendingLaneInvitation: true,
      isAcceptedLaneMember: false,
    });

    await service.signInUpWithSocialSSO(
      {
        action: 'join-workspace',
        email: 'sales.user@example.com',
        firstName: 'Sales',
        lastName: 'User',
        picture: null,
        workspaceId: workspace.id,
      },
      AuthProviderEnum.Google,
    );

    expect(computeRedirectURI).toHaveBeenCalledWith(
      expect.objectContaining({ useTeamWorkspaceDomainAlias: true }),
    );
  });

  it('keeps the social callback canonical without either exact proof', async () => {
    const { computeRedirectURI, service } = createHarness({
      hasPendingLaneInvitation: false,
      isAcceptedLaneMember: false,
    });

    await service.signInUpWithSocialSSO(
      {
        action: 'join-workspace',
        email: 'client@example.com',
        firstName: 'Client',
        lastName: 'User',
        picture: null,
        workspaceId: workspace.id,
      },
      AuthProviderEnum.Microsoft,
    );

    expect(computeRedirectURI).toHaveBeenCalledWith(
      expect.objectContaining({ useTeamWorkspaceDomainAlias: false }),
    );
  });
});
