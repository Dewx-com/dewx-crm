import { isDefined } from 'twenty-shared/utils';

import {
  type CurrentUser,
  currentUserState,
} from '@/auth/states/currentUserState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import {
  type CurrentWorkspace,
  currentWorkspaceState,
} from '@/auth/states/currentWorkspaceState';
import { billingState } from '@/client-config/states/billingState';
import { isBookCallOnboardingStepEnabledState } from '@/client-config/states/isBookCallOnboardingStepEnabledState';
import { isOnboardingAiChatEnabledState } from '@/client-config/states/isOnboardingAiChatEnabledState';
import { isWelcomeAnimationVisibleState } from '@/onboarding/states/isWelcomeAnimationVisibleState';
import { onboardingNavigationDirectionState } from '@/onboarding/states/onboardingNavigationDirectionState';
import { shouldOpenAiChatAfterOnboardingState } from '@/onboarding/states/shouldOpenAiChatAfterOnboardingState';
import { getHasJustCompletedOnboarding } from '@/onboarding/utils/getHasJustCompletedOnboarding';
import { getIsBookCallOnboardingStepPending } from '@/onboarding/utils/getIsBookCallOnboardingStepPending';
import { getIsPlanRequired } from '@/onboarding/utils/getIsPlanRequired';
import { getNextPreviousOnboardingStatus } from '@/onboarding/utils/getNextPreviousOnboardingStatus';
import { type OnboardingStepHistoryEffect } from '@/onboarding/types/OnboardingStepHistoryEffect';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

import { useStore } from 'jotai';
import { useCallback } from 'react';
import {
  OnboardingStatus,
  PermissionFlagType,
} from '~/generated-metadata/graphql';

type GetNextOnboardingStatusArgs = {
  currentUser: CurrentUser | null;
  currentWorkspace: CurrentWorkspace | null;
  isBillingEnabled: boolean;
  isBookCallRequired: boolean;
  // Whether this reader is somebody who invites people and installs apps. A client is neither, and
  // asking them to do either is asking them to do a job that is not theirs.
  canInvitePeople: boolean;
  canInstallApps: boolean;
};

const getNextOnboardingStatus = ({
  currentUser,
  currentWorkspace,
  isBillingEnabled,
  isBookCallRequired,
  canInvitePeople,
  canInstallApps,
}: GetNextOnboardingStatusArgs) => {
  const isPlanRequired = getIsPlanRequired({
    isBillingEnabled,
    currentWorkspace,
  });

  const statusAfterBookCall = isPlanRequired
    ? OnboardingStatus.PLAN_REQUIRED
    : OnboardingStatus.COMPLETED;

  const statusAfterInviteTeam =
    isBookCallRequired && isPlanRequired
      ? OnboardingStatus.BOOK_CALL
      : statusAfterBookCall;

  if (currentUser?.onboardingStatus === OnboardingStatus.WORKSPACE_ACTIVATION) {
    return OnboardingStatus.SYNC_EMAIL;
  }

  if (currentUser?.onboardingStatus === OnboardingStatus.SYNC_EMAIL) {
    if (canInstallApps && currentWorkspace?.workspaceMembersCount === 1) {
      return OnboardingStatus.APPS_INSTALLATION;
    }
    return OnboardingStatus.PROFILE_CREATION;
  }

  if (currentUser?.onboardingStatus === OnboardingStatus.APPS_INSTALLATION) {
    return OnboardingStatus.PROFILE_CREATION;
  }

  if (currentUser?.onboardingStatus === OnboardingStatus.PROFILE_CREATION) {
    if (canInvitePeople && currentWorkspace?.workspaceMembersCount === 1) {
      return OnboardingStatus.INVITE_TEAM;
    }
    return statusAfterInviteTeam;
  }
  if (currentUser?.onboardingStatus === OnboardingStatus.INVITE_TEAM) {
    return statusAfterInviteTeam;
  }
  if (
    currentUser?.onboardingStatus === OnboardingStatus.BOOK_CALL ||
    currentUser?.onboardingStatus === OnboardingStatus.PLAN_REQUIRED
  ) {
    return statusAfterBookCall;
  }
  return OnboardingStatus.COMPLETED;
};

export const useSetNextOnboardingStatus = () => {
  const store = useStore();
  const currentUser = useAtomStateValue(currentUserState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const billing = useAtomStateValue(billingState);
  const isBillingEnabled = billing?.isBillingEnabled ?? false;
  const isOnboardingAiChatEnabled = useAtomStateValue(
    isOnboardingAiChatEnabledState,
  );

  // These are the same two flags the workspace uses to gate Settings -> Members and Settings ->
  // Apps, so a reader who is routed past a step here would have found nothing to do on it anyway.
  //
  // An absent permission list counts as permission granted. It is absent only before the workspace
  // has loaded, and a guard that fired on missing data would skip the invite step for the workspace
  // creator, who is the one person it exists for. Cutting a step needs a positive no.
  //
  // The cut lives here rather than as an auto-skip effect on the invite page, which is how upstream
  // skips the sync-email and install-apps steps, because the only way off the invite step is the
  // sendInvitations mutation and a client is refused it (PERMISSION_DENIED, measured on the live
  // instance 2026-08-22). An auto-skip would throw on mount and strand them there. Choosing the next
  // step cannot strand anybody.
  const permissionFlags = useAtomStateValue(
    currentUserWorkspaceState,
  )?.permissionFlags;
  const canInvitePeople =
    !isDefined(permissionFlags) ||
    permissionFlags.includes(PermissionFlagType.WORKSPACE_MEMBERS);
  const canInstallApps =
    !isDefined(permissionFlags) ||
    permissionFlags.includes(PermissionFlagType.APPLICATIONS);

  return useCallback(
    ({
      stepHistoryEffect,
    }: {
      stepHistoryEffect: OnboardingStepHistoryEffect;
    }) => {
      const nextOnboardingStatus = getNextOnboardingStatus({
        currentUser,
        currentWorkspace,
        canInvitePeople,
        canInstallApps,
        isBillingEnabled,
        isBookCallRequired:
          store.get(isBookCallOnboardingStepEnabledState.atom) &&
          getIsBookCallOnboardingStepPending(store.get(currentUserState.atom)),
      });

      store.set(onboardingNavigationDirectionState.atom, 'forward');
      store.set(currentUserState.atom, (current) => {
        if (isDefined(current)) {
          return {
            ...current,
            onboardingStatus: nextOnboardingStatus,
            previousOnboardingStatus: getNextPreviousOnboardingStatus({
              stepHistoryEffect,
              currentOnboardingStatus: current.onboardingStatus,
              currentPreviousOnboardingStatus: current.previousOnboardingStatus,
            }),
          };
        }
        return current;
      });

      if (
        getHasJustCompletedOnboarding({
          previousOnboardingStatus: currentUser?.onboardingStatus,
          nextOnboardingStatus,
        })
      ) {
        store.set(isWelcomeAnimationVisibleState.atom, true);
        store.set(
          shouldOpenAiChatAfterOnboardingState.atom,
          isOnboardingAiChatEnabled && currentUser?.isWorkspaceCreator === true,
        );
      }
    },
    [
      currentUser,
      currentWorkspace,
      canInvitePeople,
      canInstallApps,
      isBillingEnabled,
      isOnboardingAiChatEnabled,
      store,
    ],
  );
};
