import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  StyledChip,
  StyledChipRow,
  StyledEmpty,
  StyledNote,
  StyledProse,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
  StyledSubTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import {
  type PlanRow,
  type TaskRow,
} from '@/client-workspace/hooks/useClientWorkspace';
import {
  currentPhase,
  dayStamp,
  paragraphsOf,
  phaseProgress,
  readPhases,
  type Phase,
  type PhaseState,
} from '@/client-workspace/utils/clientWorkspaceModel';

// ── The plan ────────────────────────────────────────────────────────────────────────────────────
//
// What was agreed, in the client's own copy of it, and how far along it is. Progress is measured
// from the actions written against each phase rather than declared in a field: a phase with no
// action against it says "nothing tracked yet" instead of quietly counting as not started, because
// a progress bar that moves when somebody edits a paragraph is worse than no progress bar.
//
// Only a PUBLISHED plan reaches this section. A draft is a conversation we are still having.

/** Only the two states worth colouring are listed; the rest stay the neutral chip. */
const PHASE_TONE: Partial<Record<PhaseState, string>> = {
  DONE: 'calm',
  ACTIVE: 'info',
};

const PHASE_WORDS: Record<PhaseState, string> = {
  DONE: 'done',
  ACTIVE: 'in progress',
  TODO: 'not started',
  UNTRACKED: 'nothing tracked yet',
};

const StyledPhase = styled.div`
  border-left: 2px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[3]}
    ${themeCssVariables.spacing[4]};

  &[data-state='DONE'] {
    border-left-color: ${themeCssVariables.color.green};
  }

  &[data-state='ACTIVE'] {
    border-left-color: ${themeCssVariables.color.blue};
  }
`;

const StyledPhaseHead = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledPhaseName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFieldLabel = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Field = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => {
  const parts = paragraphsOf(value);
  if (parts.length === 0) return null;
  return (
    <StyledField>
      <StyledFieldLabel>{label}</StyledFieldLabel>
      {parts.map((part, index) => (
        <StyledProse key={`${label}-${index}`}>{part}</StyledProse>
      ))}
    </StyledField>
  );
};

type Props = { plan: PlanRow | undefined; tasks: TaskRow[] };

export const ClientWorkspacePlan = ({ plan, tasks }: Props) => {
  if (!plan) {
    return (
      <StyledSection id="plan">
        <StyledSectionHead>
          <StyledSectionTitle>Plan</StyledSectionTitle>
        </StyledSectionHead>
        <StyledEmpty>
          No plan has been published yet. A plan appears here once it has been
          written, approved and published — until then what is agreed lives in
          the conversation, not on this page.
        </StyledEmpty>
      </StyledSection>
    );
  }

  const { intro, phases } = readPhases(plan.phases);
  const tracked: Phase[] = phaseProgress(phases, tasks);
  const current = currentPhase(tracked);
  const done = tracked.filter((phase) => phase.state === 'DONE').length;

  return (
    <StyledSection id="plan">
      <StyledSectionHead>
        <StyledSectionTitle>Plan</StyledSectionTitle>
        <StyledSectionMeta>
          {plan.version ? `${plan.version} · ` : ''}
          {plan.effectiveFrom
            ? `effective ${dayStamp(plan.effectiveFrom)}`
            : 'published'}
        </StyledSectionMeta>
      </StyledSectionHead>

      <StyledSubTitle>{plan.title ?? 'Plan'}</StyledSubTitle>

      <Field label="Objective" value={plan.objective} />
      <Field label="Who we approach" value={plan.icp} />
      <Field label="Markets" value={plan.markets} />
      <Field label="Who we leave alone" value={plan.exclusions} />
      <Field label="How we position it" value={plan.positioning} />
      <Field label="Channels" value={plan.channels} />

      {tracked.length > 0 && (
        <>
          <StyledFieldLabel>Phases</StyledFieldLabel>
          {intro.map((part, index) => (
            <StyledProse key={`intro-${index}`}>{part}</StyledProse>
          ))}
          <StyledChipRow>
            <StyledChip data-tone="info">
              {done} of {tracked.length} phases complete
            </StyledChip>
            {current && <StyledChip>now: {current.label}</StyledChip>}
          </StyledChipRow>
          {tracked.map((phase) => (
            <StyledPhase key={phase.key} data-state={phase.state}>
              <StyledPhaseHead>
                <StyledPhaseName>{phase.label}</StyledPhaseName>
                <StyledChip data-tone={PHASE_TONE[phase.state]}>
                  {PHASE_WORDS[phase.state]}
                </StyledChip>
                {phase.tasks.length > 0 && (
                  <StyledChip>
                    {phase.tasks.length}{' '}
                    {phase.tasks.length === 1 ? 'action' : 'actions'}
                  </StyledChip>
                )}
              </StyledPhaseHead>
              {phase.body && <StyledProse>{phase.body}</StyledProse>}
            </StyledPhase>
          ))}
          <StyledNote>
            A phase is marked complete when every action written against it is
            done. Phases with no actions yet say so rather than pretending to be
            waiting.
          </StyledNote>
        </>
      )}

      {tracked.length === 0 && intro.length > 0 && (
        <Field label="Phases" value={plan.phases} />
      )}

      <Field label="How we will know it worked" value={plan.successMeasures} />
      <Field label="Decisions we need from you" value={plan.decisionsNeeded} />
    </StyledSection>
  );
};
