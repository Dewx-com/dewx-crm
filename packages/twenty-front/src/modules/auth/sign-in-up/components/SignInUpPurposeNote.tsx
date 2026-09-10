import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';

import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const HIDDEN_ON: SignInUpStep[] = [
  SignInUpStep.Password,
  SignInUpStep.TwoFactorAuthenticationProvision,
  SignInUpStep.TwoFactorAuthenticationVerification,
  SignInUpStep.WorkspaceSelection,
  SignInUpStep.WorkspaceCreation,
];

const StyledPurpose = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.4;
  margin: ${themeCssVariables.spacing[3]} 0 0;
  max-width: ${ONBOARDING_CONTENT_BLOCK_WIDTH}px;
  text-align: center;
`;

export const SignInUpPurposeNote = () => {
  const signInUpStep = useAtomStateValue(signInUpStepState);
  const { isSharedDomainEnabled } = useAtomStateValue(domainConfigurationState);

  if (HIDDEN_ON.includes(signInUpStep)) {
    return null;
  }

  return (
    <StyledPurpose>
      {isSharedDomainEnabled ? (
        <Trans>
          Manage your contacts, sales pipeline, and team in your own CRM.
        </Trans>
      ) : (
        <>
          The team runs outreach from here, and clients read their own results.
          Your role decides which of the two you see.
        </>
      )}
    </StyledPurpose>
  );
};
