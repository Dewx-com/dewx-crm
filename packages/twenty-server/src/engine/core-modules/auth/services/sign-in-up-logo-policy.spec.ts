import { SignInUpService } from 'src/engine/core-modules/auth/services/sign-in-up.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { DpaAgreementEntity } from 'src/engine/core-modules/dpa/entities/dpa-agreement.entity';
import { WorkspaceDiscoverability } from 'src/engine/core-modules/workspace/types/workspace-discoverability.type';
import { type UserEntity } from 'src/engine/core-modules/user/user.entity';

describe('workspace signup policy', () => {
  it.each([
    {
      email: 'owner@example.invalid',
      allowIcons: false,
      expectedFetches: 0,
      shared: false,
      multi: false,
    },
    {
      email: 'owner@example.invalid',
      allowIcons: false,
      expectedFetches: 0,
      shared: true,
      multi: true,
    },
    {
      email: 'owner@example.invalid',
      allowIcons: false,
      expectedFetches: 0,
      shared: false,
      multi: true,
    },
    {
      email: 'owner@example.invalid',
      allowIcons: true,
      expectedFetches: 1,
      shared: false,
      multi: false,
    },
    {
      email: 'owner@gmail.com',
      allowIcons: true,
      expectedFetches: 0,
      shared: false,
      multi: false,
    },
  ])(
    'creates the account with $expectedFetches external logo lookups for $email (icons=$allowIcons, shared=$shared, multi=$multi)',
    async ({ email, allowIcons, expectedFetches, shared, multi }) => {
      const config: Record<string, unknown> = {
        ALLOW_REQUESTS_TO_TWENTY_ICONS: allowIcons,
        IS_SHARED_DOMAIN_ENABLED: shared,
        IS_MULTIWORKSPACE_ENABLED: multi,
      };
      const uploadWorkspaceLogoFromUrl = jest.fn().mockResolvedValue(undefined);
      const createMembership = jest.fn();
      const manager = {
        save: jest.fn(async (_entity, value) => value),
        update: jest.fn(),
        findOneBy: jest.fn().mockResolvedValue(null),
        insert: jest.fn(),
      };
      const queryRunner = { manager, query: jest.fn() };
      const service: SignInUpService = Object.assign(
        Object.create(SignInUpService.prototype),
        {
          assertWorkspaceCreationAllowed: jest.fn(),
          hasServerAdmin: jest.fn().mockResolvedValue(true),
          activateOnboardingForUser: jest.fn(),
          dataSource: {
            transaction: (run: (value: unknown) => unknown) =>
              run({ queryRunner }),
          },
          workspaceRepository: { create: (value: unknown) => value },
          subdomainManagerService: {
            generateSubdomain: jest.fn().mockResolvedValue('acceptance-crm'),
          },
          applicationService: {
            createWorkspaceCustomApplication: jest.fn().mockResolvedValue({
              universalIdentifier: 'application',
            }),
          },
          fileCorePictureService: { uploadWorkspaceLogoFromUrl },
          userWorkspaceService: { create: createMembership },
          onboardingService: { setOnboardingInviteTeamPending: jest.fn() },
          twentyConfigService: {
            get: (key: string) => config[key],
          },
          eventLogEmitterService: {
            createContext: () => ({ insertWorkspaceEvent: jest.fn() }),
          },
          billingService: { isBillingEnabled: () => false },
          workspaceCacheService: { invalidateAndRecompute: jest.fn() },
        },
      );

      const user = { id: 'owner', email } as UserEntity;
      const result = await service.signUpOnNewWorkspace(
        { type: 'existingUser', existingUser: user },
        {
          displayName: 'Acceptance CRM',
          requestId: '72c8ef0c-c724-4b97-a725-e83293476135',
        },
      );

      expect(result.user).toBe(user);
      expect(result.workspace.displayName).toBe('Acceptance CRM');
      expect(manager.save).toHaveBeenCalledWith(
        WorkspaceEntity,
        result.workspace,
      );
      expect(
        manager.save.mock.calls.filter(
          ([entity]) => entity === DpaAgreementEntity,
        ),
      ).toHaveLength(multi && !shared ? 1 : 0);
      if (shared) {
        expect(result.workspace).toMatchObject({
          allowImpersonation: false,
          isPublicInviteLinkEnabled: false,
          workspaceDiscoverability:
            WorkspaceDiscoverability.MEMBERS_AND_INVITEES,
        });
      } else {
        expect(result.workspace.allowImpersonation).toBeUndefined();
        expect(result.workspace.isPublicInviteLinkEnabled).toBeUndefined();
        expect(result.workspace.workspaceDiscoverability).toBeUndefined();
      }
      expect(createMembership).toHaveBeenCalledTimes(1);
      expect(uploadWorkspaceLogoFromUrl).toHaveBeenCalledTimes(expectedFetches);
    },
  );
});
