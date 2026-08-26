import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { IconArrowUpRight } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledSalesSection = styled.section`
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  margin: 0 auto;
  max-width: 1200px;
  padding: ${themeCssVariables.spacing[8]};
  width: 100%;

  @media (max-width: 720px) {
    padding: ${themeCssVariables.spacing[4]};
  }
`;

export const StyledSectionGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(12, minmax(0, 1fr));

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

export const StyledSurface = styled.article`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.lg};
  box-shadow: ${themeCssVariables.boxShadow.light};
  box-sizing: border-box;
  min-width: 0;
`;

export const StyledSurfaceBody = styled.div`
  padding: ${themeCssVariables.spacing[5]};
`;

export const StyledSurfaceHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: ${themeCssVariables.spacing[8]};
  padding: 0 ${themeCssVariables.spacing[5]};
`;

export const StyledSurfaceTitle = styled.h2`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin: 0;
`;

export const StyledMutedText = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.55;
  margin: 0;
`;

export const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const StyledActionRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledHeading = styled.header`
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledEyebrow = styled.div`
  color: ${themeCssVariables.color.blue9};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledTitle = styled.h1`
  font-size: clamp(
    ${themeCssVariables.font.size.xl},
    3vw,
    ${themeCssVariables.font.size.xxl}
  );
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.025em;
  line-height: 1.12;
  margin: 0;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.55;
  margin: ${themeCssVariables.spacing[2]} 0 0;
  max-width: 680px;
`;

type SalesSectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const SalesSectionHeading = ({
  id,
  eyebrow,
  title,
  description,
}: SalesSectionHeadingProps) => (
  <StyledHeading>
    <StyledEyebrow>{eyebrow}</StyledEyebrow>
    <StyledTitle id={id}>{title}</StyledTitle>
    <StyledDescription>{description}</StyledDescription>
  </StyledHeading>
);

export type SalesStatusTone =
  | 'neutral'
  | 'info'
  | 'positive'
  | 'warning'
  | 'danger';

const StyledStatusPill = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  line-height: 1;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &[data-tone='info'] {
    background: ${themeCssVariables.background.transparent.blue};
    color: ${themeCssVariables.color.blue9};
  }

  &[data-tone='positive'] {
    background: ${themeCssVariables.background.transparent.success};
    color: ${themeCssVariables.color.green9};
  }

  &[data-tone='warning'] {
    background: ${themeCssVariables.background.transparent.orange};
    color: ${themeCssVariables.color.orange11};
  }

  &[data-tone='danger'] {
    background: ${themeCssVariables.background.transparent.danger};
    color: ${themeCssVariables.font.color.danger};
  }
`;

const StyledStatusDot = styled.span`
  background: currentColor;
  border-radius: 50%;
  height: 6px;
  width: 6px;
`;

type SalesStatusPillProps = {
  children: ReactNode;
  tone?: SalesStatusTone;
};

export const SalesStatusPill = ({
  children,
  tone = 'neutral',
}: SalesStatusPillProps) => (
  <StyledStatusPill data-tone={tone}>
    <StyledStatusDot aria-hidden />
    {children}
  </StyledStatusPill>
);

const StyledRecordButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  transition:
    background 120ms cubic-bezier(0.23, 1, 0.32, 1),
    color 120ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 120ms cubic-bezier(0.23, 1, 0.32, 1);

  &:focus-visible {
    box-shadow: 0 0 0 2px ${themeCssVariables.border.color.blue};
    outline: none;
  }

  &:active {
    transform: scale(0.98);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${themeCssVariables.background.transparent.light};
      color: ${themeCssVariables.font.color.primary};
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

type SalesRecordButtonProps = {
  children: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
};

export const SalesRecordButton = ({
  children,
  onClick,
  ariaLabel,
}: SalesRecordButtonProps) => (
  <StyledRecordButton type="button" onClick={onClick} aria-label={ariaLabel}>
    {children}
    <IconArrowUpRight size={14} aria-hidden />
  </StyledRecordButton>
);

const StyledEmptyState = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  line-height: 1.5;
  padding: ${themeCssVariables.spacing[5]};
`;

const StyledEmptyStateTitle = styled.strong`
  color: ${themeCssVariables.font.color.secondary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

type SalesEmptyStateProps = {
  title: string;
  detail: string;
};

export const SalesEmptyState = ({ title, detail }: SalesEmptyStateProps) => (
  <StyledEmptyState>
    <StyledEmptyStateTitle>{title}</StyledEmptyStateTitle>
    <span>{detail}</span>
  </StyledEmptyState>
);
