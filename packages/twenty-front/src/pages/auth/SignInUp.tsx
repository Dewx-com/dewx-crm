import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { useSignInUpForm } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { selectedTeamWorkspaceLaneState } from '@/auth/sign-in-up/team-workspace/states/selectedTeamWorkspaceLaneState';
import { isCreatingWorkspaceState } from '@/auth/states/isCreatingWorkspaceState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { isTeamWorkspaceDomainAlias } from '@/team-workspace/role/types/TeamWorkspaceLane';
import { styled } from '@linaria/react';

import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

import { EmailVerificationSent } from '@/auth/sign-in-up/components/EmailVerificationSent';
import { SignInUpGlobalScopeForm } from '@/auth/sign-in-up/components/SignInUpGlobalScopeForm';
import { SignInUpStandardContent } from '@/auth/sign-in-up/components/SignInUpStandardContent';
import { SignInUpWorkspaceScopeForm } from '@/auth/sign-in-up/components/SignInUpWorkspaceScopeForm';
import { SignInUpSSOIdentityProviderSelection } from '@/auth/sign-in-up/components/internal/SignInUpSSOIdentityProviderSelection';
import { OnboardingLayout } from '@/onboarding/components/OnboardingLayout';
import { StyledOnboardingStepPage } from '@/onboarding/components/StyledOnboardingStepPage';
import { SignInUpWorkspaceCreationForm } from '@/auth/sign-in-up/components/internal/SignInUpWorkspaceCreationForm';
import { SignInUpWorkspaceScopeFormEffect } from '@/auth/sign-in-up/components/internal/SignInUpWorkspaceScopeFormEffect';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { useGetPublicWorkspaceDataByDomain } from '@/domain-manager/hooks/useGetPublicWorkspaceDataByDomain';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { useMemo } from 'react';

import { SignInUpGlobalScopeFormEffect } from '@/auth/sign-in-up/components/internal/SignInUpGlobalScopeFormEffect';
import { SignInUpSSOExchangeTokenEffect } from '@/auth/sign-in-up/components/internal/SignInUpSSOExchangeTokenEffect';
import { SignInUpTwoFactorAuthenticationProvision } from '@/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationProvision';
import { SignInUpTOTPVerification } from '@/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationVerification';
import { useWorkspaceFromInviteHash } from '@/auth/sign-in-up/hooks/useWorkspaceFromInviteHash';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { ModalContent } from 'twenty-ui/surfaces';
import { useLingui } from '@lingui/react/macro';
import { useSearchParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { Loader } from 'twenty-ui/feedback';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledLoaderContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  margin-bottom: ${themeCssVariables.spacing[8]};
  margin-top: ${themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledBackground = styled.div`
  background: ${themeCssVariables.background.secondary};
  display: flex;
  flex-direction: column;
  height: calc(100dvh / var(--t-zoom, 1));
  overflow-y: auto;
  width: 100%;
`;

export const SignInUp = () => {
  const { t } = useLingui();
  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const clientConfigApiStatus = useAtomStateValue(clientConfigApiStatusState);
  const isCreatingWorkspace = useAtomStateValue(isCreatingWorkspaceState);

  const { form } = useSignInUpForm();
  const { signInUpStep } = useSignInUp(form);
  const { isDefaultDomain } = useIsCurrentLocationOnDefaultDomain();
  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const [selectedTeamWorkspaceLane, setSelectedTeamWorkspaceLane] =
    useAtomState(selectedTeamWorkspaceLaneState);
  const { loading: getPublicWorkspaceDataLoading } =
    useGetPublicWorkspaceDataByDomain();
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const { workspaceInviteHash, workspace: workspaceFromInviteHash } =
    useWorkspaceFromInviteHash();

  const [searchParams, setSearchParams] = useSearchParams();

  const onClickOnLogo = () => {
    setSignInUpStep(SignInUpStep.Init);

    if (
      isTeamWorkspaceDomainAlias(
        workspacePublicData?.isTeamWorkspaceDomainAlias,
      )
    ) {
      setSelectedTeamWorkspaceLane(null);
    }
  };

  const onBackFromWorkspaceCreation = () => {
    if (searchParams.has('action')) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('action');
      setSearchParams(nextSearchParams, { replace: true });
    }

    setSignInUpStep(SignInUpStep.WorkspaceSelection);
  };

  const isGlobalScope = isDefaultDomain && isMultiWorkspaceEnabled;

  const title = useMemo(() => {
    if (isDefined(workspaceInviteHash)) {
      const workspaceName = workspaceFromInviteHash?.displayName ?? '';
      return t`Join ${workspaceName}`;
    }

    if (signInUpStep === SignInUpStep.WorkspaceSelection) {
      return t`Choose a workspace`;
    }

    if (signInUpStep === SignInUpStep.WorkspaceCreation) {
      return t`Create your workspace`;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationProvision) {
      return t`Set up two-factor authentication`;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationVerification) {
      return t`Enter the code from your app`;
    }

    if (isGlobalScope) {
      return t`Sign in to Prospect Engine`;
    }

    const workspaceName = workspacePublicData?.displayName;

    if (
      isTeamWorkspaceDomainAlias(
        workspacePublicData?.isTeamWorkspaceDomainAlias,
      )
    ) {
      if (!selectedTeamWorkspaceLane) {
        return t`Choose your work area`;
      }

      if (selectedTeamWorkspaceLane === 'sales') {
        return t`Sign in to Sales`;
      }

      if (selectedTeamWorkspaceLane === 'operations') {
        return t`Sign in to Operations`;
      }

      return t`Sign in to your workspace`;
    }

    if (!workspaceName) {
      return t`Sign in to your workspace`;
    }

    return t`Sign in to ${workspaceName}`;
  }, [
    workspaceInviteHash,
    signInUpStep,
    workspacePublicData?.displayName,
    workspacePublicData?.isTeamWorkspaceDomainAlias,
    isGlobalScope,
    selectedTeamWorkspaceLane,
    t,
    workspaceFromInviteHash?.displayName,
  ]);

  const signInUpForm = useMemo(() => {
    if (getPublicWorkspaceDataLoading || !clientConfigApiStatus.isLoadedOnce) {
      return (
        <StyledLoaderContainer>
          <Loader color="gray" />
        </StyledLoaderContainer>
      );
    }

    // The workspace creation form is shared by both multi-workspace and
    // single-workspace self-host, so it must render regardless of domain or
    // workspace scope.
    if (signInUpStep === SignInUpStep.WorkspaceCreation) {
      return <SignInUpWorkspaceCreationForm />;
    }

    if (isDefaultDomain && isMultiWorkspaceEnabled) {
      return (
        <>
          <SignInUpSSOExchangeTokenEffect />
          <SignInUpGlobalScopeFormEffect />
          <SignInUpGlobalScopeForm />
        </>
      );
    }

    if (
      isOnAWorkspace &&
      signInUpStep === SignInUpStep.SSOIdentityProviderSelection
    ) {
      return <SignInUpSSOIdentityProviderSelection />;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationProvision) {
      return <SignInUpTwoFactorAuthenticationProvision />;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationVerification) {
      return <SignInUpTOTPVerification />;
    }

    if (isDefined(workspacePublicData) && isOnAWorkspace) {
      return (
        <>
          <SignInUpWorkspaceScopeFormEffect />
          <SignInUpWorkspaceScopeForm />
        </>
      );
    }

    return (
      <>
        <SignInUpSSOExchangeTokenEffect />
        <SignInUpGlobalScopeFormEffect />
        <SignInUpGlobalScopeForm />
      </>
    );
  }, [
    clientConfigApiStatus.isLoadedOnce,
    isDefaultDomain,
    isMultiWorkspaceEnabled,
    isOnAWorkspace,
    getPublicWorkspaceDataLoading,
    signInUpStep,
    workspacePublicData,
  ]);

  return signInUpStep === SignInUpStep.WorkspaceCreation ? (
    <OnboardingLayout
      onBack={!isCreatingWorkspace ? onBackFromWorkspaceCreation : undefined}
    >
      <StyledOnboardingStepPage>{signInUpForm}</StyledOnboardingStepPage>
    </OnboardingLayout>
  ) : (
    <StyledBackground>
      {signInUpStep === SignInUpStep.EmailVerification ? (
        <ModalContent isVerticallyCentered isHorizontallyCentered>
          <EmailVerificationSent email={searchParams.get('email')} />
        </ModalContent>
      ) : (
        <SignInUpStandardContent
          workspacePublicData={workspacePublicData}
          signInUpForm={signInUpForm}
          signInUpStep={signInUpStep}
          title={title}
          onClickOnLogo={onClickOnLogo}
        />
      )}
    </StyledBackground>
  );
};
