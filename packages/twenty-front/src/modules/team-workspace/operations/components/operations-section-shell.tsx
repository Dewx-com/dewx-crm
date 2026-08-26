import { type ReactNode } from 'react';

import {
  StyledBody,
  StyledEyebrow,
  StyledHeader,
  StyledHeaderRow,
  StyledLead,
  StyledTitle,
  StyledWorkspace,
} from './operations-workspace-layout';

type OperationsSectionShellProps = {
  eyebrow: string;
  title: string;
  lead: string;
  headerAside?: ReactNode;
  children: ReactNode;
};

export const OperationsSectionShell = ({
  eyebrow,
  title,
  lead,
  headerAside,
  children,
}: OperationsSectionShellProps) => (
  <StyledWorkspace>
    <StyledHeader>
      <StyledEyebrow>{eyebrow}</StyledEyebrow>
      <StyledHeaderRow>
        <StyledTitle>{title}</StyledTitle>
        {headerAside}
      </StyledHeaderRow>
      <StyledLead>{lead}</StyledLead>
    </StyledHeader>
    <StyledBody>{children}</StyledBody>
  </StyledWorkspace>
);
