import { StyledOnboardingContentContainer } from '@/auth/components/StyledOnboardingContentContainer';
import { SignInUpWithCredentials } from '@/auth/sign-in-up/components/internal/SignInUpWithCredentials';
import { SignInUpWithGoogle } from '@/auth/sign-in-up/components/internal/SignInUpWithGoogle';
import { SignInUpWithMicrosoft } from '@/auth/sign-in-up/components/internal/SignInUpWithMicrosoft';
import { SignInUpWithSSO } from '@/auth/sign-in-up/components/internal/SignInUpWithSSO';
import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { useSignInUpForm } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { useWorkspaceBypass } from '@/auth/sign-in-up/hooks/useWorkspaceBypass';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { isTeamWorkspaceDomainAlias } from '@/team-workspace/role/types/TeamWorkspaceLane';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { workspaceAuthBypassProvidersState } from '@/workspace/states/workspaceAuthBypassProvidersState';
import { workspaceAuthProvidersState } from '@/workspace/states/workspaceAuthProvidersState';
import { Trans } from '@lingui/react/macro';
import { FormProvider } from 'react-hook-form';
import { HorizontalSeparator } from 'twenty-ui/layout';
import { ClickToActionLink } from 'twenty-ui/navigation';

export const SignInUpWorkspaceScopeForm = () => {
  const workspaceAuthProviders = useAtomStateValue(workspaceAuthProvidersState);
  const workspaceAuthBypassProviders = useAtomStateValue(
    workspaceAuthBypassProvidersState,
  );
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const { shouldOfferBypass, shouldUseBypass } = useWorkspaceBypass();

  const { form } = useSignInUpForm();

  const { handleResetPassword } = useHandleResetPassword();

  const { signInUpStep } = useSignInUp(form);

  if (!workspaceAuthProviders) {
    return null;
  }

  const isTeamWorkspace = isTeamWorkspaceDomainAlias(
    workspacePublicData?.isTeamWorkspaceDomainAlias,
  );

  const providers =
    shouldOfferBypass && shouldUseBypass
      ? {
          ...workspaceAuthBypassProviders,
          sso: [],
        }
      : workspaceAuthProviders;

  return (
    <>
      <StyledOnboardingContentContainer>

        {!isTeamWorkspace && providers.google && (
          <SignInUpWithGoogle action="join-workspace" />
        )}

        {!isTeamWorkspace && providers.microsoft && (
          <SignInUpWithMicrosoft action="join-workspace" />
        )}

        {!isTeamWorkspace && providers.sso.length > 0 && <SignInUpWithSSO />}

        {!isTeamWorkspace &&
        (providers.google || providers.microsoft || providers.sso.length > 0) &&
        providers.password ? (
          <HorizontalSeparator />
        ) : null}
        {providers.password && (
          // oxlint-disable-next-line react/jsx-props-no-spreading
          <FormProvider {...form}>
            <SignInUpWithCredentials />
          </FormProvider>
        )}
      </StyledOnboardingContentContainer>
      {signInUpStep === SignInUpStep.Password && (
        <ClickToActionLink
          onClick={handleResetPassword(form.getValues('email'))}
        >
          <Trans>Forgot your password?</Trans>
        </ClickToActionLink>
      )}
    </>
  );
};
