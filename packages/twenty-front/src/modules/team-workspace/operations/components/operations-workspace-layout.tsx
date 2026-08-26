import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledWorkspace = styled.div`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
`;

export const StyledHeader = styled.header`
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[6]}
    ${themeCssVariables.spacing[4]};
  position: sticky;
  top: 0;
  z-index: 2;
`;

export const StyledHeaderRow = styled.div`
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

export const StyledEyebrow = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.02em;
  margin: 0;
`;

export const StyledLead = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: 0;
  max-width: 72ch;
`;

export const StyledBody = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  margin: 0 auto;
  max-width: 1180px;
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[6]}
    ${themeCssVariables.spacing[10]};
  width: 100%;

  @media (max-width: 720px) {
    padding-left: ${themeCssVariables.spacing[3]};
    padding-right: ${themeCssVariables.spacing[3]};
  }
`;

export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const StyledSectionHead = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

export const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

export const StyledSectionHint = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

export const StyledMetrics = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
`;

export const StyledMetric = styled.div`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};

  &[data-tone='risk'] {
    background: ${themeCssVariables.background.transparent.danger};
    border-color: ${themeCssVariables.border.color.danger};
  }

  &[data-tone='watch'] {
    background: ${themeCssVariables.background.transparent.orange};
  }
`;

export const StyledMetricValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

export const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

export const StyledTwoColumns = styled.div`
  align-items: start;
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const StyledPanel = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  min-width: 0;
  overflow: hidden;
`;

export const StyledPanelHead = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

export const StyledPanelTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

export const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.55;
  padding: ${themeCssVariables.spacing[4]};
`;

export const StyledCallout = styled.div`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-left: 3px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.55;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  &[data-tone='risk'] {
    background: ${themeCssVariables.background.transparent.danger};
    border-color: ${themeCssVariables.border.color.danger};
    border-left-color: ${themeCssVariables.color.red};
  }

  &[data-tone='watch'] {
    background: ${themeCssVariables.background.transparent.orange};
    border-left-color: ${themeCssVariables.color.orange};
  }
`;
