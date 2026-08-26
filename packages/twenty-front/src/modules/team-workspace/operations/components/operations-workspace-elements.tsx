import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledPill = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.tertiary};
  display: inline-flex;
  flex-shrink: 0;
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
    color: ${themeCssVariables.color.orange};
  }

  &[data-tone='healthy'] {
    background: ${themeCssVariables.background.transparent.success};
    color: ${themeCssVariables.color.green};
  }

  &[data-tone='info'] {
    background: ${themeCssVariables.background.transparent.blue};
    border-color: ${themeCssVariables.border.color.blue};
    color: ${themeCssVariables.color.blue};
  }
`;

export const StyledButton = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  justify-content: center;
  min-height: 28px;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  transition:
    background-color 120ms cubic-bezier(0.23, 1, 0.32, 1),
    border-color 120ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 120ms cubic-bezier(0.23, 1, 0.32, 1);

  &[data-variant='primary'] {
    background: ${themeCssVariables.color.blue};
    border-color: ${themeCssVariables.color.blue};
    color: ${themeCssVariables.font.color.inverted};
  }

  &[data-variant='danger'] {
    color: ${themeCssVariables.font.color.danger};
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${themeCssVariables.background.transparent.light};
      border-color: ${themeCssVariables.border.color.strong};
    }

    &[data-variant='primary']:hover:not(:disabled) {
      background: ${themeCssVariables.color.blue};
      filter: brightness(0.96);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition-property: background-color, border-color;
  }
`;

export const StyledTextButton = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  padding: 0;
  text-align: left;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;

  &:disabled {
    color: inherit;
    cursor: default;
  }

  &:focus-visible {
    border-radius: ${themeCssVariables.border.radius.sm};
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      color: ${themeCssVariables.font.color.primary};
      text-decoration-color: currentColor;
    }
  }
`;

export const StyledRecord = styled.article`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};

  &:last-child {
    border-bottom: 0;
  }

  &[data-tone='risk'] {
    box-shadow: inset 3px 0 0 ${themeCssVariables.color.red};
  }

  &[data-tone='watch'] {
    box-shadow: inset 3px 0 0 ${themeCssVariables.color.orange};
  }
`;

export const StyledRecordHead = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-width: 0;
`;

export const StyledRecordTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1.45;
  margin: 0;
  min-width: 0;
`;

export const StyledRecordMeta = styled.div`
  color: ${themeCssVariables.font.color.light};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  line-height: 1.45;
`;

export const StyledRecordBody = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: 0;
`;

export const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

export const StyledEvidence = styled.div`
  align-items: flex-start;
  background: ${themeCssVariables.background.transparent.success};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 2px;
  line-height: 1.45;
  padding: ${themeCssVariables.spacing[2]};

  &[data-missing='true'] {
    background: ${themeCssVariables.background.transparent.danger};
    color: ${themeCssVariables.font.color.danger};
  }
`;

export const StyledScroller = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  max-width: 100%;
  overflow-x: auto;
`;

export const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 920px;
  width: 100%;

  th,
  td {
    padding: ${themeCssVariables.spacing[3]};
    text-align: left;
    vertical-align: top;
  }

  th {
    background: ${themeCssVariables.background.transparent.lighter};
    color: ${themeCssVariables.font.color.light};
    font-size: ${themeCssVariables.font.size.xs};
    font-weight: ${themeCssVariables.font.weight.medium};
    letter-spacing: 0.04em;
    position: sticky;
    text-transform: uppercase;
    top: 0;
    z-index: 1;
  }

  td {
    border-top: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.secondary};
    line-height: 1.45;
  }

  tbody tr:focus-within {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

export const StyledCellStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

export const StyledCellHint = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

export const StyledBoard = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(4, minmax(230px, 1fr));
  overflow-x: auto;
  padding-bottom: ${themeCssVariables.spacing[2]};
`;

export const StyledBoardColumn = styled.section`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  min-width: 230px;
  overflow: hidden;
`;

export const StyledBoardHead = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

export const StyledBoardCards = styled.div`
  display: flex;
  flex-direction: column;
`;
