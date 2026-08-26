import { type CanActivate, Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ApiKeyService } from 'src/engine/core-modules/api-key/services/api-key.service';
import { AppTokenEntity } from 'src/engine/core-modules/app-token/app-token.entity';
import { EventLogEmitterService } from 'src/engine/core-modules/event-logs/emit/event-log-emitter.service';
import { ImpersonationAuthorizationService } from 'src/engine/core-modules/impersonation/services/impersonation-authorization.service';
import { SignInUpService } from 'src/engine/core-modules/auth/services/sign-in-up.service';
import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { RefreshTokenService } from 'src/engine/core-modules/auth/token/services/refresh-token.service';
import { SSOExchangeTokenService } from 'src/engine/core-modules/auth/token/services/sso-exchange-token.service';
import { WorkspaceAgnosticTokenService } from 'src/engine/core-modules/auth/token/services/workspace-agnostic-token.service';
import { CaptchaGuard } from 'src/engine/core-modules/captcha/captcha.guard';
import { EmailPasswordResetLinkInput } from 'src/engine/core-modules/auth/dto/email-password-reset-link.input';
import { SignUpInput } from 'src/engine/core-modules/auth/dto/sign-up.input';
import { type I18nContext } from 'src/engine/core-modules/i18n/types/i18n-context.type';
import {
  ThrottlerException,
  ThrottlerExceptionCode,
} from 'src/engine/core-modules/throttler/throttler.exception';
import { ThrottlerService } from 'src/engine/core-modules/throttler/throttler.service';
import { SubdomainManagerService } from 'src/engine/core-modules/domain/subdomain-manager/services/subdomain-manager.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { EmailVerificationService } from 'src/engine/core-modules/email-verification/services/email-verification.service';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { FileCorePictureService } from 'src/engine/core-modules/file/file-core-picture/services/file-core-picture.service';
import { UserSessionCookieService } from 'src/engine/core-modules/user-session/services/user-session-cookie.service';
import { UserSessionService } from 'src/engine/core-modules/user-session/services/user-session.service';
import { SSOService } from 'src/engine/core-modules/sso/services/sso.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { TwoFactorAuthenticationService } from 'src/engine/core-modules/two-factor-authentication/two-factor-authentication.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceInvitationService } from 'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

import { AuthResolver } from './auth.resolver';

import { AuthService } from './services/auth.service';
import { ResetPasswordService } from './services/reset-password.service';
import { EmailVerificationTokenService } from './token/services/email-verification-token.service';
import { LoginTokenService } from './token/services/login-token.service';
import { RenewTokenService } from './token/services/renew-token.service';
import { TransientTokenService } from './token/services/transient-token.service';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let resetPasswordService: ResetPasswordService;
  let throttlerService: ThrottlerService;
  let authService: AuthService;
  let emailVerificationService: EmailVerificationService;
  let loginTokenService: LoginTokenService;
  let userService: UserService;
  let workspaceDomainsService: WorkspaceDomainsService;
  let workspaceInvitationService: WorkspaceInvitationService;
  const mock_CaptchaGuard: CanActivate = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: getRepositoryToken(AppTokenEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserWorkspaceEntity),
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: {
            checkAccessForSignIn: jest.fn(),
            findInvitationForSignInUp: jest.fn(),
            findWorkspaceForSignInUp: jest.fn(),
            formatUserDataPayload: jest.fn(),
            signInUp: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {},
        },
        {
          provide: UserService,
          useValue: {
            findUserByEmail: jest.fn(),
          },
        },
        {
          provide: WorkspaceDomainsService,
          useValue: {
            buildWorkspaceURL: jest
              .fn()
              .mockResolvedValue(new URL('http://localhost:3001')),
            getWorkspaceUrls: jest.fn(),
            getWorkspaceUrlsForTeamWorkspaceDomainAlias: jest.fn(),
          },
        },
        {
          provide: WorkspaceInvitationService,
          useValue: {
            isTeamWorkspaceLaneInvitation: jest.fn(),
            isTeamWorkspaceLaneMember: jest.fn(),
          },
        },
        {
          provide: SubdomainManagerService,
          useValue: {},
        },
        {
          provide: FileCorePictureService,
          useValue: {},
        },
        {
          provide: UserSessionService,
          useValue: {},
        },
        {
          provide: UserSessionCookieService,
          useValue: {},
        },
        {
          provide: UserWorkspaceService,
          useValue: {},
        },
        {
          provide: RenewTokenService,
          useValue: {},
        },
        {
          provide: SignInUpService,
          useValue: {},
        },
        {
          provide: ApiKeyService,
          useValue: {},
        },
        {
          provide: AccessTokenService,
          useValue: {},
        },
        {
          provide: ResetPasswordService,
          useValue: {
            generateAndSendPasswordResetLink: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: ThrottlerService,
          useValue: {
            tokenBucketThrottleOrThrow: jest.fn(),
          },
        },
        {
          provide: LoginTokenService,
          useValue: {
            generateLoginToken: jest.fn(),
          },
        },
        {
          provide: WorkspaceAgnosticTokenService,
          useValue: {},
        },
        {
          provide: SSOExchangeTokenService,
          useValue: {},
        },
        {
          provide: TransientTokenService,
          useValue: {},
        },
        {
          provide: EmailVerificationService,
          useValue: {
            sendVerificationEmail: jest.fn(),
          },
        },
        {
          provide: EmailVerificationTokenService,
          useValue: {},
        },
        {
          provide: ImpersonationAuthorizationService,
          useValue: {},
        },
        {
          provide: PermissionsService,
          useValue: {},
        },
        {
          provide: FeatureFlagService,
          useValue: {},
        },
        {
          provide: SSOService,
          useValue: {},
        },
        {
          provide: TwoFactorAuthenticationService,
          useValue: {},
        },
        {
          provide: TwentyConfigService,
          useValue: {},
        },
        {
          provide: EventLogEmitterService,
          useValue: {
            createContext: jest.fn().mockReturnValue({
              insertWorkspaceEvent: jest.fn(),
            }),
          },
        },
      ],
    })
      .overrideGuard(CaptchaGuard)
      .useValue(mock_CaptchaGuard)
      .compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    resetPasswordService =
      module.get<ResetPasswordService>(ResetPasswordService);
    throttlerService = module.get<ThrottlerService>(ThrottlerService);
    authService = module.get<AuthService>(AuthService);
    emailVerificationService = module.get<EmailVerificationService>(
      EmailVerificationService,
    );
    loginTokenService = module.get<LoginTokenService>(LoginTokenService);
    userService = module.get<UserService>(UserService);
    workspaceDomainsService = module.get<WorkspaceDomainsService>(
      WorkspaceDomainsService,
    );
    workspaceInvitationService = module.get<WorkspaceInvitationService>(
      WorkspaceInvitationService,
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('signUpInWorkspace invitation routing', () => {
    const workspace = {
      id: '22222222-2222-4222-8222-222222222222',
      subdomain: 'app',
      customDomain: null,
      isCustomDomainEnabled: false,
    } as WorkspaceEntity;
    const invitation = {
      context: { roleId: 'invited-role-id' },
    } as AppTokenEntity;
    const signUpInput = {
      email: 'sales.user@example.com',
      password: 'not-a-real-password',
      workspaceInviteHash: 'workspace-invite-hash',
      workspacePersonalInviteToken: 'personal-invite-token',
    } as SignUpInput;

    beforeEach(() => {
      (authService.findWorkspaceForSignInUp as jest.Mock).mockResolvedValue(
        workspace,
      );
      (authService.findInvitationForSignInUp as jest.Mock).mockResolvedValue(
        invitation,
      );
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(undefined);
      (authService.formatUserDataPayload as jest.Mock).mockReturnValue({
        userData: {
          type: 'newUser',
          newUserPayload: { email: signUpInput.email },
        },
      });
      (authService.checkAccessForSignIn as jest.Mock).mockResolvedValue(
        undefined,
      );
      (authService.signInUp as jest.Mock).mockResolvedValue({
        user: { id: 'user-id', email: signUpInput.email },
        workspace,
      });
      (
        emailVerificationService.sendVerificationEmail as jest.Mock
      ).mockResolvedValue(undefined);
      (loginTokenService.generateLoginToken as jest.Mock).mockResolvedValue({
        token: 'login-token',
        expiresAt: new Date('2026-08-27T00:00:00.000Z'),
      });
      (
        workspaceInvitationService.isTeamWorkspaceLaneInvitation as jest.Mock
      ).mockResolvedValue(false);
      (
        workspaceInvitationService.isTeamWorkspaceLaneMember as jest.Mock
      ).mockResolvedValue(false);
    });

    it('returns the team alias from a validated pending Sales or Operations invitation', async () => {
      (
        workspaceInvitationService.isTeamWorkspaceLaneInvitation as jest.Mock
      ).mockResolvedValue(true);
      (
        workspaceDomainsService.getWorkspaceUrlsForTeamWorkspaceDomainAlias as jest.Mock
      ).mockReturnValue({
        customUrl: 'https://team.prospectengine.com/',
        subdomainUrl: 'https://app.prospectengine.com/',
      });

      const result = await resolver.signUpInWorkspace(
        signUpInput,
        AuthProviderEnum.Password,
      );

      expect(result.workspace.workspaceUrls).toEqual({
        customUrl: 'https://team.prospectengine.com/',
        subdomainUrl: 'https://app.prospectengine.com/',
      });
      expect(
        workspaceInvitationService.isTeamWorkspaceLaneInvitation,
      ).toHaveBeenCalledWith({
        workspaceId: workspace.id,
        roleId: 'invited-role-id',
      });
      expect(
        workspaceInvitationService.isTeamWorkspaceLaneMember,
      ).toHaveBeenCalledWith({
        workspaceId: workspace.id,
        userId: 'user-id',
      });
      expect(
        emailVerificationService.sendVerificationEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ useTeamWorkspaceDomainAlias: true }),
      );
      expect(workspaceDomainsService.getWorkspaceUrls).not.toHaveBeenCalled();
    });

    it('returns the team alias for an accepted Sales or Operations member after the invitation is gone', async () => {
      (authService.findInvitationForSignInUp as jest.Mock).mockResolvedValue(
        undefined,
      );
      (
        workspaceInvitationService.isTeamWorkspaceLaneMember as jest.Mock
      ).mockResolvedValue(true);
      (
        workspaceDomainsService.getWorkspaceUrlsForTeamWorkspaceDomainAlias as jest.Mock
      ).mockReturnValue({
        customUrl: 'https://team.prospectengine.com/',
        subdomainUrl: 'https://app.prospectengine.com/',
      });

      const result = await resolver.signUpInWorkspace(
        signUpInput,
        AuthProviderEnum.Password,
      );

      expect(result.workspace.workspaceUrls.customUrl).toBe(
        'https://team.prospectengine.com/',
      );
      expect(
        emailVerificationService.sendVerificationEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ useTeamWorkspaceDomainAlias: true }),
      );
    });

    it('keeps non-lane invitations on the canonical app domain', async () => {
      (
        workspaceInvitationService.isTeamWorkspaceLaneInvitation as jest.Mock
      ).mockResolvedValue(false);
      (workspaceDomainsService.getWorkspaceUrls as jest.Mock).mockReturnValue({
        customUrl: undefined,
        subdomainUrl: 'https://app.prospectengine.com/',
      });

      const result = await resolver.signUpInWorkspace(
        signUpInput,
        AuthProviderEnum.Password,
      );

      expect(result.workspace.workspaceUrls).toEqual({
        customUrl: undefined,
        subdomainUrl: 'https://app.prospectengine.com/',
      });
      expect(
        emailVerificationService.sendVerificationEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ useTeamWorkspaceDomainAlias: false }),
      );
      expect(
        workspaceDomainsService.getWorkspaceUrlsForTeamWorkspaceDomainAlias,
      ).not.toHaveBeenCalled();
    });
  });

  describe('emailPasswordResetLink', () => {
    const emailPasswordResetInput = {
      email: 'test@example.com',
      workspaceId: 'workspace-id',
    } as EmailPasswordResetLinkInput;
    const context = { req: { locale: 'en' } } as I18nContext;

    it('should send the password reset link and return success', async () => {
      const result = await resolver.emailPasswordResetLink(
        emailPasswordResetInput,
        context,
      );

      expect(result).toEqual({ success: true });
      expect(
        resetPasswordService.generateAndSendPasswordResetLink,
      ).toHaveBeenCalledWith({
        email: 'test@example.com',
        workspaceId: 'workspace-id',
        locale: 'en',
      });
    });

    it('should return success without waiting for the link to be sent', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      (
        resetPasswordService.generateAndSendPasswordResetLink as jest.Mock
      ).mockRejectedValue(new Error('database down'));

      const result = await resolver.emailPasswordResetLink(
        emailPasswordResetInput,
        context,
      );

      expect(result).toEqual({ success: true });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send the password reset link',
        expect.any(Error),
      );
    });

    it('should throttle and send with a normalized email address', async () => {
      await resolver.emailPasswordResetLink(
        {
          email: 'TeSt@Example.com',
        } as EmailPasswordResetLinkInput,
        context,
      );

      expect(throttlerService.tokenBucketThrottleOrThrow).toHaveBeenCalledWith(
        'password-reset-email:test@example.com',
        1,
        expect.any(Number),
        expect.any(Number),
      );
      expect(
        resetPasswordService.generateAndSendPasswordResetLink,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('should surface the throttling error without sending the link', async () => {
      (
        throttlerService.tokenBucketThrottleOrThrow as jest.Mock
      ).mockRejectedValue(
        new ThrottlerException(
          'Limit reached',
          ThrottlerExceptionCode.LIMIT_REACHED,
        ),
      );

      await expect(
        resolver.emailPasswordResetLink(emailPasswordResetInput, context),
      ).rejects.toThrow(ThrottlerException);
      expect(
        resetPasswordService.generateAndSendPasswordResetLink,
      ).not.toHaveBeenCalled();
    });

    it('should rethrow non throttling errors', async () => {
      (
        throttlerService.tokenBucketThrottleOrThrow as jest.Mock
      ).mockRejectedValue(new Error('cache down'));

      await expect(
        resolver.emailPasswordResetLink(emailPasswordResetInput, context),
      ).rejects.toThrow('cache down');
      expect(
        resetPasswordService.generateAndSendPasswordResetLink,
      ).not.toHaveBeenCalled();
    });
  });
});
