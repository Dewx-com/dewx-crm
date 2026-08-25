import { styled } from '@linaria/react';

import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// One line under the sign-in title saying what this is for.
//
// Two different people arrive at this screen and neither of them has been told anything yet: an
// inside-sales person who is about to spend their day working accounts, and a client who has been
// given a login and does not know what they are about to see. The line has to be true for both, so
// it names both and then says the thing that decides which one they get, which is their role.
//
// It is deliberately not a slogan. A slogan on a sign-in screen tells a client nothing and tells a
// new employee less.
//
// It renders only on the steps where somebody is actually arriving. Once they are typing a password,
// picking a workspace or reading a 2FA code, they know where they are and the line is noise, so the
// step list below matches the one that governs the legal footer.

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

  if (HIDDEN_ON.includes(signInUpStep)) {
    return null;
  }

  return (
    <StyledPurpose>
      The team runs outreach from here, and clients read their own results. Your
      role decides which of the two you see.
    </StyledPurpose>
  );
};
