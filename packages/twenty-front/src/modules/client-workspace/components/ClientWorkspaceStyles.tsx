import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// ── The client workspace — the shared surfaces ──────────────────────────────────────────────────
//
// One set of primitives for every section, so the page reads as one document rather than as eight
// widgets that were each styled on a different afternoon. Tone (calm / watch / risk / done) travels
// as a `data-tone` attribute rather than as a prop, which keeps every rule static CSS that Linaria
// can extract at build time, and keeps the component count down to what the sections actually need.

export const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  border-left: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
`;

export const StyledBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  margin: 0 auto;
  max-width: 1100px;
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[6]}
    ${themeCssVariables.spacing[10]};
  width: 100%;
`;

export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  scroll-margin-top: ${themeCssVariables.spacing[10]};
`;

export const StyledSectionHead = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

export const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.06em;
  margin: 0;
  text-transform: uppercase;
`;

export const StyledSectionMeta = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

export const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

export const StyledSubTitle = styled.h3`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

export const StyledProse = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  margin: 0;
  max-width: 78ch;
`;

export const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  margin: 0;
  max-width: 78ch;
`;

export const StyledHint = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

export const StyledEmpty = styled.div`
  border: 1px dashed ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  padding: ${themeCssVariables.spacing[4]};
`;

export const StyledCardGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
`;

export const StyledCard = styled.div`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]};
`;

export const StyledBigNumber = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

export const StyledCardLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

export const StyledCardHint = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.4;
`;

export const StyledChipRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

/**
 * One chip, four tones. `data-tone` rather than a prop so the CSS stays static: risk is the only
 * one that shouts, because a page where everything shouts says nothing.
 */
export const StyledChip = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.tertiary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  padding: 2px ${themeCssVariables.spacing[2]};
  white-space: nowrap;

  &[data-tone='risk'] {
    background: ${themeCssVariables.background.transparent.danger};
    border-color: ${themeCssVariables.border.color.danger};
    color: ${themeCssVariables.font.color.danger};
  }

  &[data-tone='watch'] {
    background: ${themeCssVariables.background.transparent.orange};
    border-color: ${themeCssVariables.border.color.medium};
    color: ${themeCssVariables.color.orange};
  }

  &[data-tone='calm'] {
    background: ${themeCssVariables.background.transparent.success};
    border-color: ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.color.green};
  }

  &[data-tone='info'] {
    background: ${themeCssVariables.background.transparent.blue};
    border-color: ${themeCssVariables.border.color.blue};
    color: ${themeCssVariables.color.blue};
  }
`;

export const StyledBanner = styled.div`
  align-items: flex-start;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-left: 3px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  line-height: 1.6;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  &[data-tone='risk'] {
    background: ${themeCssVariables.background.transparent.danger};
    border-color: ${themeCssVariables.border.color.danger};
    border-left-color: ${themeCssVariables.color.red};
    color: ${themeCssVariables.font.color.primary};
  }

  &[data-tone='watch'] {
    background: ${themeCssVariables.background.transparent.orange};
    border-left-color: ${themeCssVariables.color.orange};
  }

  &[data-tone='calm'] {
    background: ${themeCssVariables.background.transparent.success};
    border-left-color: ${themeCssVariables.color.green};
  }
`;

export const StyledBannerTitle = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

export const StyledBarTrack = styled.div`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  flex: 1;
  height: 10px;
  min-width: 60px;
  overflow: hidden;
`;

export const StyledBarFill = styled.div`
  background: ${themeCssVariables.color.blue};
  height: 100%;

  &[data-tone='qualified'] {
    background: ${themeCssVariables.color.green};
  }

  &[data-tone='meeting'] {
    background: ${themeCssVariables.color.green};
  }

  &[data-tone='engagement'] {
    background: ${themeCssVariables.color.turquoise};
  }

  &[data-tone='muted'] {
    background: ${themeCssVariables.background.transparent.medium};
  }
`;

export const StyledRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
`;

export const StyledListRow = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

export const StyledListName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  min-width: 0;
`;

export const StyledListMeta = styled.span`
  color: ${themeCssVariables.font.color.light};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  text-align: right;
`;

/** Wide tables scroll inside themselves; the page never scrolls sideways. */
export const StyledScroller = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  max-width: 100%;
  overflow-x: auto;
`;

export const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 100%;
  white-space: nowrap;

  th,
  td {
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
    text-align: left;
  }

  th {
    background: ${themeCssVariables.background.transparent.lighter};
    color: ${themeCssVariables.font.color.light};
    font-size: ${themeCssVariables.font.size.xs};
    font-weight: ${themeCssVariables.font.weight.medium};
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  td {
    border-top: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.secondary};
  }

  td[data-numeric='true'],
  th[data-numeric='true'] {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  td[data-strong='true'] {
    color: ${themeCssVariables.font.color.primary};
    white-space: normal;
  }
`;

export const StyledColumns = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

export const StyledColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

export const StyledSelect = styled.select`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  max-width: 260px;
  outline: none;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  option {
    background: ${themeCssVariables.background.primary};
    color: ${themeCssVariables.font.color.primary};
  }
`;

export const StyledTextButton = styled.button`
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
    color: ${themeCssVariables.font.color.primary};
  }

  &[data-active='true'] {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;
