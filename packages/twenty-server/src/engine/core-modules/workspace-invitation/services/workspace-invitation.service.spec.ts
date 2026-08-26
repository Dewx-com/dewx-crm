import { type Repository } from 'typeorm';

import {
  AppTokenEntity,
  AppTokenType,
} from 'src/engine/core-modules/app-token/app-token.entity';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';
import { ThrottlerService } from 'src/engine/core-modules/throttler/throttler.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { RoleValidationService } from 'src/engine/metadata-modules/role-validation/services/role-validation.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

import { WorkspaceInvitationService } from './workspace-invitation.service';

jest.mock('twenty-emails', () => ({
  SendInviteLinkEmail: jest.fn().mockReturnValue({}),
  renderEmail: jest
    .fn()
    .mockImplementation(async (_template, options) =>
      options?.plainText ? 'Plain text invitation' : '<p>HTML invitation</p>',
    ),
}));

describe('WorkspaceInvitationService', () => {
  const createTestHarness = ({
    roleLabel = 'Sales',
    isTeamWorkspace = true,
    hasUserWorkspace = true,
    memberRoleLabels = [roleLabel],
  }: {
    roleLabel?: string;
    isTeamWorkspace?: boolean;
    hasUserWorkspace?: boolean;
    memberRoleLabels?: string[];
  } = {}) => {
    const recipientEmail = 'sales.user@example.com';
    const emailService = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    const onboardingService = {
      completeOnboardingInviteTeamStep: jest.fn().mockResolvedValue(undefined),
    };
    const workspaceDomainsService = {
      buildWorkspaceURL: jest
        .fn()
        .mockReturnValue(new URL('https://app.prospectengine.com/invite')),
      buildTeamWorkspaceDomainAliasURL: jest
        .fn()
        .mockReturnValue(new URL('https://team.prospectengine.com/invite')),
      isTeamWorkspaceId: jest.fn().mockReturnValue(isTeamWorkspace),
    };
    const roleValidationService = {
      getRoleAssignableToUsersOrThrow: jest
        .fn()
        .mockResolvedValue({ label: roleLabel }),
    };
    const userWorkspace = {
      id: '44444444-4444-4444-8444-444444444444',
    } as UserWorkspaceEntity;
    const userWorkspaceRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue(hasUserWorkspace ? userWorkspace : null),
    };
    const userRoleService = {
      getRolesByUserWorkspaces: jest
        .fn()
        .mockResolvedValue(
          new Map([
            [userWorkspace.id, memberRoleLabels.map((label) => ({ label }))],
          ]),
        ),
    };
    const throttlerService = {
      tokenBucketThrottleOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    const configValues = new Map<string, unknown>([
      ['IS_BILLING_ENABLED', false],
      ['INVITATION_SENDING_BY_EMAIL_THROTTLE_LIMIT', 10],
      ['INVITATION_SENDING_BY_EMAIL_THROTTLE_TTL_IN_MS', 60_000],
      ['INVITATION_SENDING_BY_WORKSPACE_THROTTLE_LIMIT', 10],
      ['INVITATION_SENDING_BY_WORKSPACE_THROTTLE_TTL_IN_MS', 60_000],
      ['SERVER_URL', 'https://app.prospectengine.com'],
      ['EMAIL_FROM_ADDRESS', 'hello@prospectengine.com'],
    ]);
    const twentyConfigService = {
      get: jest.fn((key: string) => configValues.get(key)),
    };

    const service = new WorkspaceInvitationService(
      {} as Repository<AppTokenEntity>,
      userWorkspaceRepository as unknown as Repository<UserWorkspaceEntity>,
      roleValidationService as unknown as RoleValidationService,
      twentyConfigService as unknown as TwentyConfigService,
      emailService as unknown as EmailService,
      onboardingService as unknown as OnboardingService,
      workspaceDomainsService as unknown as WorkspaceDomainsService,
      {
        getI18nInstance: jest.fn().mockReturnValue({}),
      } as unknown as I18nService,
      throttlerService as unknown as ThrottlerService,
      {} as FileUrlService,
      userRoleService as unknown as UserRoleService,
    );
    const invitation = {
      id: '11111111-1111-4111-8111-111111111111',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      value: 'invitation-token',
      type: AppTokenType.InvitationToken,
      context: { email: recipientEmail, roleId: 'invited-role-id' },
      expiresAt: new Date('2026-08-27T00:00:00.000Z'),
    } as AppTokenEntity;

    const workspace = {
      id: invitation.workspaceId,
      displayName: 'Prospect Engine',
      inviteHash: 'workspace-invite-hash',
      logoFileId: null,
    } as WorkspaceEntity;
    const sender = {
      userId: '33333333-3333-4333-8333-333333333333',
      userEmail: 'owner@example.com',
      name: { firstName: 'Roki', lastName: 'Hasan' },
      locale: 'en',
    } as WorkspaceMemberWorkspaceEntity;

    jest
      .spyOn(service, 'createWorkspaceInvitation')
      .mockResolvedValue(invitation);

    return {
      emailService,
      invitation,
      recipientEmail,
      roleValidationService,
      sender,
      service,
      userRoleService,
      userWorkspaceRepository,
      workspace,
      workspaceDomainsService,
    };
  };

  it('routes a Sales invitation to the team domain and keeps workspace branding', async () => {
    const {
      emailService,
      recipientEmail,
      sender,
      service,
      workspace,
      workspaceDomainsService,
    } = createTestHarness();

    const result = await service.sendInvitations(
      [recipientEmail],
      workspace,
      sender,
      'invited-role-id',
    );

    expect(result.success).toBe(true);
    expect(
      workspaceDomainsService.buildTeamWorkspaceDomainAliasURL,
    ).toHaveBeenCalledTimes(1);
    expect(workspaceDomainsService.buildWorkspaceURL).not.toHaveBeenCalled();
    expect(emailService.send).toHaveBeenCalledWith({
      from: '"Roki Hasan (via Prospect Engine)" <hello@prospectengine.com>',
      to: recipientEmail,
      subject: 'Join Prospect Engine',
      text: 'Plain text invitation',
      html: '<p>HTML invitation</p>',
    });
  });

  it('routes an Operations invitation to the team domain', async () => {
    const {
      recipientEmail,
      sender,
      service,
      workspace,
      workspaceDomainsService,
    } = createTestHarness({ roleLabel: 'Operations' });

    await service.sendInvitations(
      [recipientEmail],
      workspace,
      sender,
      'invited-role-id',
    );

    expect(
      workspaceDomainsService.buildTeamWorkspaceDomainAliasURL,
    ).toHaveBeenCalledTimes(1);
    expect(workspaceDomainsService.buildWorkspaceURL).not.toHaveBeenCalled();
  });

  it.each(['Admin', 'Client Manager'])(
    'keeps a %s invitation on the canonical app domain',
    async (roleLabel) => {
      const {
        recipientEmail,
        sender,
        service,
        workspace,
        workspaceDomainsService,
      } = createTestHarness({ roleLabel });

      await service.sendInvitations(
        [recipientEmail],
        workspace,
        sender,
        'invited-role-id',
      );

      expect(workspaceDomainsService.buildWorkspaceURL).toHaveBeenCalledTimes(
        1,
      );
      expect(
        workspaceDomainsService.buildTeamWorkspaceDomainAliasURL,
      ).not.toHaveBeenCalled();
    },
  );

  it('does not route a same-named Sales role from another workspace to the team domain', async () => {
    const {
      recipientEmail,
      sender,
      service,
      workspace,
      workspaceDomainsService,
    } = createTestHarness({ isTeamWorkspace: false });

    await service.sendInvitations(
      [recipientEmail],
      workspace,
      sender,
      'invited-role-id',
    );

    expect(workspaceDomainsService.buildWorkspaceURL).toHaveBeenCalledTimes(1);
    expect(
      workspaceDomainsService.buildTeamWorkspaceDomainAliasURL,
    ).not.toHaveBeenCalled();
  });

  it.each(['Sales', 'Operations'])(
    'recognizes an accepted member with exactly one %s role',
    async (roleLabel) => {
      const { service, workspace } = createTestHarness({
        memberRoleLabels: [roleLabel],
      });

      await expect(
        service.isTeamWorkspaceLaneMember({
          workspaceId: workspace.id,
          userId: 'accepted-user-id',
        }),
      ).resolves.toBe(true);
    },
  );

  it.each(['Admin', 'Client Manager', 'Team Automation', 'Unknown'])(
    'rejects an accepted member with a %s role',
    async (roleLabel) => {
      const { service, workspace } = createTestHarness({
        memberRoleLabels: [roleLabel],
      });

      await expect(
        service.isTeamWorkspaceLaneMember({
          workspaceId: workspace.id,
          userId: 'accepted-user-id',
        }),
      ).resolves.toBe(false);
    },
  );

  it('rejects a missing accepted member', async () => {
    const { service, workspace, userRoleService } = createTestHarness({
      hasUserWorkspace: false,
    });

    await expect(
      service.isTeamWorkspaceLaneMember({
        workspaceId: workspace.id,
        userId: 'missing-user-id',
      }),
    ).resolves.toBe(false);
    expect(userRoleService.getRolesByUserWorkspaces).not.toHaveBeenCalled();
  });

  it('rejects a member with no roles', async () => {
    const { service, workspace } = createTestHarness({
      memberRoleLabels: [],
    });

    await expect(
      service.isTeamWorkspaceLaneMember({
        workspaceId: workspace.id,
        userId: 'roleless-user-id',
      }),
    ).resolves.toBe(false);
  });

  it('rejects a member with multiple roles', async () => {
    const { service, workspace } = createTestHarness({
      memberRoleLabels: ['Sales', 'Admin'],
    });

    await expect(
      service.isTeamWorkspaceLaneMember({
        workspaceId: workspace.id,
        userId: 'ambiguous-user-id',
      }),
    ).resolves.toBe(false);
  });

  it('rejects membership outside the configured team workspace without a lookup', async () => {
    const { service, workspace, userWorkspaceRepository } = createTestHarness({
      isTeamWorkspace: false,
    });

    await expect(
      service.isTeamWorkspaceLaneMember({
        workspaceId: workspace.id,
        userId: 'wrong-workspace-user-id',
      }),
    ).resolves.toBe(false);
    expect(userWorkspaceRepository.findOne).not.toHaveBeenCalled();
  });
});
