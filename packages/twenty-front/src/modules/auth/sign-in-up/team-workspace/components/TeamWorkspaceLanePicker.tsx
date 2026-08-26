import { styled } from '@linaria/react';

import { selectedTeamWorkspaceLaneState } from '@/auth/sign-in-up/team-workspace/states/selectedTeamWorkspaceLaneState';
import {
  TEAM_WORKSPACE_LANE_LABELS,
  type TeamWorkspaceLane,
} from '@/team-workspace/role/types/TeamWorkspaceLane';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const LANE_OPTIONS: Array<{
  lane: TeamWorkspaceLane;
  description: string;
}> = [
  {
    lane: 'sales',
    description:
      'Prepare for calls, manage the pipeline, and review what to improve.',
  },
  {
    lane: 'operations',
    description:
      'Track client delivery, meetings, work updates, and next actions.',
  },
];

const StyledPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledPrompt = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0 0 ${themeCssVariables.spacing[2]};
  text-align: center;
`;

const StyledLaneButton = styled.button`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-family: ${themeCssVariables.font.family};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[4]};
  text-align: left;
  transition:
    background 120ms ease,
    border-color 120ms ease;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
    border-color: ${themeCssVariables.border.color.strong};
  }

  &:focus-visible {
    border-color: ${themeCssVariables.border.color.strong};
    outline: 2px solid ${themeCssVariables.border.color.strong};
    outline-offset: 2px;
  }
`;

const StyledLaneLabel = styled.span`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledLaneDescription = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
`;

const StyledSelection = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: space-between;
  margin-bottom: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledChangeButton = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]};
`;

export const TeamWorkspaceLanePicker = () => {
  const [selectedTeamWorkspaceLane, setSelectedTeamWorkspaceLane] =
    useAtomState(selectedTeamWorkspaceLaneState);
  const setSignInUpStep = useSetAtomState(signInUpStepState);

  const chooseLane = (lane: TeamWorkspaceLane) => {
    setSelectedTeamWorkspaceLane(lane);
    setSignInUpStep(SignInUpStep.Init);
  };

  const changeLane = () => {
    setSelectedTeamWorkspaceLane(null);
    setSignInUpStep(SignInUpStep.Init);
  };

  if (selectedTeamWorkspaceLane) {
    return (
      <StyledSelection>
        <span>
          {TEAM_WORKSPACE_LANE_LABELS[selectedTeamWorkspaceLane]} workspace
        </span>
        <StyledChangeButton type="button" onClick={changeLane}>
          Change
        </StyledChangeButton>
      </StyledSelection>
    );
  }

  return (
    <StyledPicker aria-label="Choose your work area">
      <StyledPrompt>Where are you working today?</StyledPrompt>
      {LANE_OPTIONS.map(({ lane, description }) => (
        <StyledLaneButton
          key={lane}
          type="button"
          onClick={() => chooseLane(lane)}
        >
          <StyledLaneLabel>{TEAM_WORKSPACE_LANE_LABELS[lane]}</StyledLaneLabel>
          <StyledLaneDescription>{description}</StyledLaneDescription>
        </StyledLaneButton>
      ))}
    </StyledPicker>
  );
};
