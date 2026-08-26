import { type Response } from 'express';
import { type Repository } from 'typeorm';

import { AppTokenEntity } from 'src/engine/core-modules/app-token/app-token.entity';
import { SSOAuthController } from 'src/engine/core-modules/auth/controllers/sso-auth.controller';
import { AuthService } from 'src/engine/core-modules/auth/services/auth.service';
import { type OIDCRequest } from 'src/engine/core-modules/auth/strategies/oidc.auth.strategy';
import { LoginTokenService } from 'src/engine/core-modules/auth/token/services/login-token.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { GuardRedirectService } from 'src/engine/core-modules/guard-redirect/services/guard-redirect.service';
import { SSOService } from 'src/engine/core-modules/sso/services/sso.service';
import {
  IdentityProviderType,
  SSOIdentityProviderStatus,
  WorkspaceSSOIdentityProviderEntity,
} from 'src/engine/core-modules/sso/workspace-sso-identity-provider.entity';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceInvitationService } from 'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service';

describe('SSOAuthController team workspace routing', () => {
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
    const invitation = hasPendingLaneInvitation
      ? ({ context: { roleId: 'invited-role-id' } } as AppTokenEntity)
      : undefined;
    const authService = {
      checkAccessForSignIn: jest.fn().mockResolvedValue(undefined),
      computeRedirectURI: jest
        .fn()
        .mockReturnValue('https://team.prospectengine.com/verify'),
      createSSOConnectedAccountIfFeatureFlagIsOn: jest
        .fn()
        .mockResolvedValue(undefined),
      findInvitationForSignInUp: jest.fn().mockResolvedValue(invitation),
      findWorkspaceForSignInUp: jest.fn().mockResolvedValue(workspace),
      formatUserDataPayload: jest.fn().mockReturnValue({
        userData: {
          type: 'newUser',
          newUserPayload: { email: 'sales.user@example.com' },
        },
      }),
      signInUp: jest.fn().mockResolvedValue({
        user: { id: 'user-id', email: 'sales.user@example.com' },
        workspace,
      }),
    };
    const workspaceInvitationService = {
      isTeamWorkspaceLaneInvitation: jest
        .fn()
        .mockResolvedValue(hasPendingLaneInvitation),
      isTeamWorkspaceLaneMember: jest
        .fn()
        .mockResolvedValue(isAcceptedLaneMember),
    };
    const identityProvider = {
      id: 'identity-provider-id',
      status: SSOIdentityProviderStatus.Active,
      type: IdentityProviderType.OIDC,
      workspace,
      workspaceId: workspace.id,
    } as WorkspaceSSOIdentityProviderEntity;
    const response = {
      redirect: jest.fn(),
    } as unknown as Response;

    const controller = new SSOAuthController(
      {
        generateLoginToken: jest.fn().mockResolvedValue({
          token: 'login-token',
        }),
      } as unknown as LoginTokenService,
      authService as unknown as AuthService,
      {
        getRedirectErrorUrlAndCaptureExceptions: jest.fn(),
      } as unknown as GuardRedirectService,
      {
        getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain:
          jest.fn(),
      } as unknown as WorkspaceDomainsService,
      {
        findUserByEmail: jest.fn().mockResolvedValue(undefined),
      } as unknown as UserService,
      {} as SSOService,
      workspaceInvitationService as unknown as WorkspaceInvitationService,
      {
        findOne: jest.fn().mockResolvedValue(identityProvider),
      } as unknown as Repository<WorkspaceSSOIdentityProviderEntity>,
    );

    return {
      authService,
      controller,
      response,
      workspaceInvitationService,
    };
  };

  it.each([
    ['an accepted lane member', false, true],
    ['a validated pending invitation', true, false],
  ] as const)(
    'keeps the enterprise callback on the team alias for %s',
    async (_label, hasPendingLaneInvitation, isAcceptedLaneMember) => {
      const { authService, controller, response } = createHarness({
        hasPendingLaneInvitation,
        isAcceptedLaneMember,
      });

      await controller.oidcAuthCallback(
        {
          user: {
            email: 'sales.user@example.com',
            identityProviderId: 'identity-provider-id',
          },
        } as OIDCRequest,
        response,
      );

      expect(authService.computeRedirectURI).toHaveBeenCalledWith(
        expect.objectContaining({ useTeamWorkspaceDomainAlias: true }),
      );
    },
  );

  it('keeps the enterprise callback canonical without either exact proof', async () => {
    const { authService, controller, response } = createHarness({
      hasPendingLaneInvitation: false,
      isAcceptedLaneMember: false,
    });

    await controller.oidcAuthCallback(
      {
        user: {
          email: 'client@example.com',
          identityProviderId: 'identity-provider-id',
        },
      } as OIDCRequest,
      response,
    );

    expect(authService.computeRedirectURI).toHaveBeenCalledWith(
      expect.objectContaining({ useTeamWorkspaceDomainAlias: false }),
    );
  });
});
