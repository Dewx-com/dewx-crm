import { type Repository } from 'typeorm';

import { AppTokenEntity } from 'src/engine/core-modules/app-token/app-token.entity';
import { EmailVerificationTokenService } from 'src/engine/core-modules/auth/token/services/email-verification-token.service';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceInvitationService } from 'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service';

import { EmailVerificationService } from './email-verification.service';

jest.mock('twenty-emails', () => ({
  SendEmailVerificationLinkEmail: jest.fn().mockReturnValue({}),
  renderEmail: jest
    .fn()
    .mockImplementation(async (_template, options) =>
      options?.plainText ? 'Plain text verification' : '<p>Verification</p>',
    ),
}));

describe('EmailVerificationService workspace routing', () => {
  const createService = ({
    isMatchingTeamOrigin = true,
    isTeamWorkspaceLaneMember = true,
  }: {
    isMatchingTeamOrigin?: boolean;
    isTeamWorkspaceLaneMember?: boolean;
  } = {}) => {
    const appTokenRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-id',
        isEmailVerified: false,
      }),
    };
    const workspaceDomainsService = {
      buildTeamWorkspaceDomainAliasURL: jest
        .fn()
        .mockReturnValue(
          new URL('https://team.prospectengine.com/verify-email'),
        ),
      buildWorkspaceURL: jest
        .fn()
        .mockReturnValue(
          new URL('https://app.prospectengine.com/verify-email'),
        ),
      isTeamWorkspaceDomainAliasForWorkspace: jest
        .fn()
        .mockReturnValue(isMatchingTeamOrigin),
    };
    const workspaceInvitationService = {
      isTeamWorkspaceLaneMember: jest
        .fn()
        .mockResolvedValue(isTeamWorkspaceLaneMember),
    };
    const twentyConfigService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          EMAIL_FROM_ADDRESS: 'hello@prospectengine.com',
          EMAIL_FROM_NAME: 'Prospect Engine',
          IS_EMAIL_VERIFICATION_REQUIRED: true,
        };

        return values[key];
      }),
    };

    const service = new EmailVerificationService(
      appTokenRepository as unknown as Repository<AppTokenEntity>,
      userRepository as unknown as Repository<UserEntity>,
      workspaceDomainsService as unknown as WorkspaceDomainsService,
      {
        buildBaseUrl: jest.fn(),
      } as unknown as DomainServerConfigService,
      {
        send: jest.fn().mockResolvedValue(undefined),
      } as unknown as EmailService,
      twentyConfigService as unknown as TwentyConfigService,
      {
        generateToken: jest
          .fn()
          .mockResolvedValue({ token: 'email-verification-token' }),
      } as unknown as EmailVerificationTokenService,
      {
        getI18nInstance: jest.fn().mockReturnValue({
          _: jest.fn().mockReturnValue('Verify your email'),
        }),
      } as unknown as I18nService,
      workspaceInvitationService as unknown as WorkspaceInvitationService,
    );

    return {
      service,
      workspaceDomainsService,
      workspaceInvitationService,
    };
  };

  const workspace = {
    id: '22222222-2222-4222-8222-222222222222',
    subdomain: 'app',
    customDomain: null,
    isCustomDomainEnabled: false,
  } as WorkspaceEntity;

  it('keeps a lane invitation verification link on the team alias', async () => {
    const { service, workspaceDomainsService } = createService();

    await service.sendVerificationEmail({
      userId: 'user-id',
      email: 'sales.user@example.com',
      workspace,
      locale: 'en',
      useTeamWorkspaceDomainAlias: true,
    });

    expect(
      workspaceDomainsService.buildTeamWorkspaceDomainAliasURL,
    ).toHaveBeenCalledTimes(1);
    expect(workspaceDomainsService.buildWorkspaceURL).not.toHaveBeenCalled();
  });

  it('keeps ordinary verification links on the canonical app domain', async () => {
    const { service, workspaceDomainsService } = createService();

    await service.sendVerificationEmail({
      userId: 'user-id',
      email: 'client@example.com',
      workspace,
      locale: 'en',
    });

    expect(workspaceDomainsService.buildWorkspaceURL).toHaveBeenCalledTimes(1);
    expect(
      workspaceDomainsService.buildTeamWorkspaceDomainAliasURL,
    ).not.toHaveBeenCalled();
  });

  it('resends on the team alias only for a matching origin and exact lane member', async () => {
    const { service, workspaceDomainsService, workspaceInvitationService } =
      createService();
    const sendVerificationEmail = jest
      .spyOn(service, 'sendVerificationEmail')
      .mockResolvedValue({ success: true });

    await service.resendEmailVerificationToken(
      'sales.user@example.com',
      workspace,
      'en',
      'https://team.prospectengine.com',
    );

    expect(
      workspaceDomainsService.isTeamWorkspaceDomainAliasForWorkspace,
    ).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      origin: 'https://team.prospectengine.com',
    });
    expect(
      workspaceInvitationService.isTeamWorkspaceLaneMember,
    ).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      userId: 'user-id',
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ useTeamWorkspaceDomainAlias: true }),
    );
  });

  it('keeps resend canonical when the request origin is the app domain', async () => {
    const { service, workspaceInvitationService } = createService({
      isMatchingTeamOrigin: false,
    });
    const sendVerificationEmail = jest
      .spyOn(service, 'sendVerificationEmail')
      .mockResolvedValue({ success: true });

    await service.resendEmailVerificationToken(
      'sales.user@example.com',
      workspace,
      'en',
      'https://app.prospectengine.com',
    );

    expect(
      workspaceInvitationService.isTeamWorkspaceLaneMember,
    ).not.toHaveBeenCalled();
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ useTeamWorkspaceDomainAlias: false }),
    );
  });

  it('keeps resend canonical for a non-lane member on the team origin', async () => {
    const { service } = createService({ isTeamWorkspaceLaneMember: false });
    const sendVerificationEmail = jest
      .spyOn(service, 'sendVerificationEmail')
      .mockResolvedValue({ success: true });

    await service.resendEmailVerificationToken(
      'client@example.com',
      workspace,
      'en',
      'https://team.prospectengine.com',
    );

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ useTeamWorkspaceDomainAlias: false }),
    );
  });
});
