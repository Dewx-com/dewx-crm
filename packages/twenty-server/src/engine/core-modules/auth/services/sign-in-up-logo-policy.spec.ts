import { SignInUpService } from 'src/engine/core-modules/auth/services/sign-in-up.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type UserEntity } from 'src/engine/core-modules/user/user.entity';

describe('workspace signup logo policy', () => {
  it.each([
    { email: 'owner@example.invalid', allowIcons: false, expectedFetches: 0 },
    { email: 'owner@example.invalid', allowIcons: true, expectedFetches: 1 },
    { email: 'owner@gmail.com', allowIcons: true, expectedFetches: 0 },
  ])(
    'creates the account with $expectedFetches external logo lookups for $email (enabled=$allowIcons)',
    async ({ email, allowIcons, expectedFetches }) => {
      const uploadWorkspaceLogoFromUrl = jest.fn().mockResolvedValue(undefined);
      const createMembership = jest.fn();
      const manager = {
        save: jest.fn(async (_entity, value) => value),
        update: jest.fn(),
      };
      const queryRunner = { manager };
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
            get: (key: string) =>
              key === 'ALLOW_REQUESTS_TO_TWENTY_ICONS' && allowIcons,
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
        { displayName: 'Acceptance CRM' },
      );

      expect(result.user).toBe(user);
      expect(result.workspace.displayName).toBe('Acceptance CRM');
      expect(manager.save).toHaveBeenCalledWith(
        WorkspaceEntity,
        result.workspace,
      );
      expect(createMembership).toHaveBeenCalledTimes(1);
      expect(uploadWorkspaceLogoFromUrl).toHaveBeenCalledTimes(expectedFetches);
    },
  );
});
