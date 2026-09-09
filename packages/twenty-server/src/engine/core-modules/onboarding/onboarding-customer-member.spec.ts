import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { OnboardingStatus } from 'src/engine/core-modules/onboarding/enums/onboarding-status.enum';
import {
  OnboardingService,
  OnboardingStepKeys,
} from 'src/engine/core-modules/onboarding/onboarding.service';

describe('customer member onboarding', () => {
  it.each([
    { shared: true, userId: 'member', expected: OnboardingStatus.COMPLETED },
    { shared: true, userId: 'creator', expected: OnboardingStatus.INVITE_TEAM },
    { shared: false, userId: 'member', expected: OnboardingStatus.INVITE_TEAM },
  ])(
    'returns $expected for $userId (shared=$shared)',
    async ({ shared, userId, expected }) => {
      const service: OnboardingService = Object.assign(
        Object.create(OnboardingService.prototype),
        {
          workspaceRepository: {
            findOne: jest
              .fn()
              .mockResolvedValue({
                id: 'account',
                activationStatus: WorkspaceActivationStatus.ACTIVE,
              }),
          },
          userWorkspaceRepository: {
            findOne: jest.fn().mockResolvedValue({ userId: 'creator' }),
          },
          userVarsService: {
            getAll: jest
              .fn()
              .mockResolvedValue(
                new Map([
                  [OnboardingStepKeys.ONBOARDING_INVITE_TEAM_PENDING, true],
                ]),
              ),
          },
          twentyConfigService: {
            get: (key: string) => key === 'IS_SHARED_DOMAIN_ENABLED' && shared,
          },
          billingService: {
            isSubscriptionIncompleteOnboardingStatus: jest
              .fn()
              .mockResolvedValue(false),
          },
        },
      );
      expect(
        await service.getOnboardingStatus({ userId, workspaceId: 'account' }),
      ).toBe(expected);
    },
  );
});
