import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  StyledBarFill,
  StyledBarTrack,
  StyledChip,
  StyledNote,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import {
  BAND_WORDS,
  formatCount,
  formatPercent,
  ratio,
  type FunnelStep,
} from '@/client-workspace/utils/clientWorkspaceModel';

// ── The funnel ──────────────────────────────────────────────────────────────────────────────────
//
// Seven steps in the order the work happens, drawn on one scale so the drop-off is the thing you
// see. Each row carries two labels that are the whole point of this section: what kind of thing it
// is — work done, interest, qualified, result — and where the number came from. Volume at the top
// and nothing at the bottom is a picture worth showing plainly; a page that hides it by scaling
// each bar to itself is telling the client a story rather than the truth.

const StyledStep = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: 160px minmax(80px, 1fr) 72px 96px;
  padding: ${themeCssVariables.spacing[1]} 0;

  @media (max-width: 700px) {
    grid-template-columns: 130px minmax(60px, 1fr) 60px;
  }
`;

const StyledStepName = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledStepValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
  text-align: right;
`;

const StyledStepShare = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  text-align: right;

  @media (max-width: 700px) {
    display: none;
  }
`;

const StyledSources = styled.div`
  color: ${themeCssVariables.font.color.light};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
`;

const TONE: Record<string, string> = {
  activity: 'muted',
  engagement: 'engagement',
  qualified: 'qualified',
  meeting: 'meeting',
};

type Props = { steps: FunnelStep[]; sourceLabel: string };

export const ClientWorkspaceFunnel = ({ steps, sourceLabel }: Props) => {
  const widest = Math.max(1, ...steps.map((step) => step.value ?? 0));
  const baseline = steps[0]?.value ?? 0;
  const baseSource = steps[0]?.source;
  const sources = [...new Set(steps.map((step) => step.source))];

  return (
    <StyledSection id="funnel">
      <StyledSectionHead>
        <StyledSectionTitle>From invitation to meeting</StyledSectionTitle>
        <StyledSectionMeta>{sourceLabel}</StyledSectionMeta>
      </StyledSectionHead>

      {steps.map((step) => {
        // A share of invitations only means something when both numbers were counted the same way.
        const comparable = step.source === baseSource && baseline > 0;
        return (
          <StyledStep key={step.key}>
            <StyledStepName>{step.label}</StyledStepName>
            <StyledBarTrack>
              <StyledBarFill
                data-tone={step.value === null ? 'muted' : TONE[step.band]}
                style={{ width: `${Math.round(((step.value ?? 0) / widest) * 100)}%` }}
              />
            </StyledBarTrack>
            <StyledStepValue>
              {step.value === null ? '—' : formatCount(step.value)}
            </StyledStepValue>
            <StyledStepShare>
              {comparable && step.value !== null
                ? `${formatPercent(ratio(step.value, baseline))} of invitations`
                : BAND_WORDS[step.band]}
            </StyledStepShare>
          </StyledStep>
        );
      })}

      <StyledSources>
        {sources.map((source) => (
          <StyledChip key={source}>{source}</StyledChip>
        ))}
      </StyledSources>

      <StyledNote>
        Invitations, sequences and messages are work we did. Accepted connections and replies are
        interest from the other side. Only qualified leads and meetings are results, and they are the
        two numbers worth judging a month by — a large number at the top of this list with nothing at
        the bottom means the outreach is running, not that it is working.
      </StyledNote>
    </StyledSection>
  );
};
