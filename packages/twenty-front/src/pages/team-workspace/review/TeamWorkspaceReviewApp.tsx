import { styled } from '@linaria/react';
import { useState } from 'react';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme-constants';

import {
  OperationsWorkspace,
  type OperationsWorkspaceSection,
} from '@/team-workspace/operations';
import {
  SalesWorkspace,
  type SalesWorkspaceSection,
} from '@/team-workspace/sales';
import { type TeamWorkspaceLane } from '@/team-workspace/role/types/TeamWorkspaceLane';
import {
  operationsReviewData,
  salesReviewData,
} from './teamWorkspaceReviewData';

const StyledReviewRoot = styled.div`
  background: ${themeCssVariables.background.secondary};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-family: ${themeCssVariables.font.family};
  height: 100vh;
  min-height: 0;
  min-width: 0;

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const StyledSidebar = styled.aside`
  background: ${themeCssVariables.background.secondary};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: flex;
  flex: 0 0 236px;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[3]};

  @media (max-width: 760px) {
    align-items: center;
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    border-right: 0;
    flex: 0 0 auto;
    flex-direction: row;
    gap: ${themeCssVariables.spacing[2]};
    overflow-x: auto;
    padding: ${themeCssVariables.spacing[2]};
  }
`;

const StyledBrand = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledMark = styled.div`
  align-items: center;
  background: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: white;
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 28px;
  justify-content: center;
  width: 28px;
`;

const StyledBrandText = styled.div`
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};

  span {
    color: ${themeCssVariables.font.color.light};
    font-size: ${themeCssVariables.font.size.xs};
    font-weight: ${themeCssVariables.font.weight.regular};
  }
`;

const StyledNavLabel = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  padding: 0 ${themeCssVariables.spacing[2]};
  text-transform: uppercase;

  @media (max-width: 760px) {
    display: none;
  }
`;

const StyledNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};

  @media (max-width: 760px) {
    flex-direction: row;
  }
`;

const StyledNavButton = styled.button`
  background: transparent;
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  text-align: left;

  &[data-active='true'] {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
  }

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

const StyledSidebarFooter = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: auto;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]} 0;

  @media (max-width: 760px) {
    border-left: 1px solid ${themeCssVariables.border.color.light};
    border-top: 0;
    flex: 0 0 auto;
    margin-left: auto;
    margin-top: 0;
    padding: 0 0 0 ${themeCssVariables.spacing[3]};
  }
`;

const StyledIdentity = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.45;

  span {
    color: ${themeCssVariables.font.color.light};
    display: block;
    font-size: ${themeCssVariables.font.size.xs};
  }
`;

const StyledLinkButton = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  padding: 0;
  text-align: left;
`;

const StyledMain = styled.main`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: auto;
`;

const StyledReviewBadge = styled.div`
  background: ${themeCssVariables.background.transparent.blue};
  border-bottom: 1px solid ${themeCssVariables.border.color.blue};
  color: ${themeCssVariables.color.blue9};
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[6]};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const StyledToast = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  bottom: ${themeCssVariables.spacing[4]};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  left: 50%;
  max-width: min(520px, calc(100vw - 32px));
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  position: fixed;
  transform: translateX(-50%);
  z-index: 20;
`;

const StyledLoginPage = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 100vh;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledLoginCard = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.lg};
  box-shadow: ${themeCssVariables.boxShadow.light};
  box-sizing: border-box;
  max-width: 520px;
  padding: ${themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledLoginEyebrow = styled.div`
  color: ${themeCssVariables.color.blue9};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledLoginTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.03em;
  margin: 0;
`;

const StyledLoginLead = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.55;
  margin: ${themeCssVariables.spacing[2]} 0 ${themeCssVariables.spacing[6]};
`;

const StyledLaneGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StyledLaneButton = styled.button`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 122px;
  padding: ${themeCssVariables.spacing[4]};
  text-align: left;

  strong {
    font-size: ${themeCssVariables.font.size.md};
  }

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    line-height: 1.45;
  }

  &:hover {
    border-color: ${themeCssVariables.border.color.strong};
  }
`;

const StyledFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.light};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.md};
  min-height: 38px;
  padding: 0 ${themeCssVariables.spacing[3]};

  &:focus-visible {
    border-color: ${themeCssVariables.color.blue};
    box-shadow: 0 0 0 3px ${themeCssVariables.color.transparent.blue2};
    outline: none;
  }
`;

const StyledAuthRule = styled.div`
  background: ${themeCssVariables.background.transparent.lighter};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledLoginActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: ${themeCssVariables.spacing[5]};
`;

const StyledActionButton = styled.button`
  background: ${themeCssVariables.color.blue};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: white;
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  min-height: 36px;
  padding: 0 ${themeCssVariables.spacing[4]};

  &[data-variant='secondary'] {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const SALES_NAV: Array<{ section: SalesWorkspaceSection; label: string }> = [
  { section: 'today', label: 'Today' },
  { section: 'meetings', label: 'Meetings' },
  { section: 'pipeline', label: 'Pipeline' },
  { section: 'call-coaching', label: 'Call coaching' },
];

const OPERATIONS_NAV: Array<{
  section: OperationsWorkspaceSection;
  label: string;
}> = [
  { section: 'today', label: 'Today' },
  { section: 'clients', label: 'Clients' },
  { section: 'work', label: 'Work' },
  { section: 'meetings', label: 'Meetings' },
];

const ReviewLogin = ({
  lane,
  onChooseLane,
  onOpen,
}: {
  lane: TeamWorkspaceLane | null;
  onChooseLane: (lane: TeamWorkspaceLane | null) => void;
  onOpen: () => void;
}) => (
  <StyledLoginPage>
    <StyledLoginCard>
      <StyledLoginEyebrow>Prospect Engine · team access</StyledLoginEyebrow>
      <StyledLoginTitle>
        {lane === null
          ? 'Choose your work area'
          : `Sign in to ${lane === 'sales' ? 'Sales' : 'Operations'}`}
      </StyledLoginTitle>
      <StyledLoginLead>
        {lane === null
          ? 'Abrar prepares and advances sales conversations. Fahim protects delivery, client promises, and work updates.'
          : 'The chosen work area never grants permission by itself. Your password and stored server role must also match.'}
      </StyledLoginLead>

      {lane === null ? (
        <StyledLaneGrid>
          <StyledLaneButton onClick={() => onChooseLane('sales')}>
            <strong>Sales · Abrar</strong>
            <span>
              Next meetings, preparation, follow-ups, pipeline, and call
              coaching.
            </span>
          </StyledLaneButton>
          <StyledLaneButton onClick={() => onChooseLane('operations')}>
            <strong>Operations · Fahim</strong>
            <span>
              Client delivery, work, blockers, verified updates, and meetings.
            </span>
          </StyledLaneButton>
        </StyledLaneGrid>
      ) : (
        <>
          <StyledFields>
            <StyledField>
              Work ID or email
              <StyledInput
                type="email"
                placeholder={
                  lane === 'sales'
                    ? 'abrar@prospectengine.com'
                    : 'fahim@prospectengine.com'
                }
              />
            </StyledField>
            <StyledField>
              Password
              <StyledInput type="password" placeholder="Enter password" />
            </StyledField>
            <StyledAuthRule>
              Review mode does not send these fields. In the real app, Twenty
              verifies the password first, then checks the account’s Sales,
              Operations, or Admin role before accepting the session.
            </StyledAuthRule>
          </StyledFields>
          <StyledLoginActions>
            <StyledActionButton
              data-variant="secondary"
              onClick={() => onChooseLane(null)}
            >
              Back
            </StyledActionButton>
            <StyledActionButton onClick={onOpen}>
              Open review workspace
            </StyledActionButton>
          </StyledLoginActions>
        </>
      )}
    </StyledLoginCard>
  </StyledLoginPage>
);

export const TeamWorkspaceReviewApp = () => {
  const [lane, setLane] = useState<TeamWorkspaceLane | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [salesSection, setSalesSection] =
    useState<SalesWorkspaceSection>('today');
  const [operationsSection, setOperationsSection] =
    useState<OperationsWorkspaceSection>('today');
  const [notice, setNotice] = useState<string | null>(null);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  };

  if (!authenticated || lane === null) {
    return (
      <ThemeProvider colorScheme="light">
        <ReviewLogin
          lane={lane}
          onChooseLane={(nextLane) => {
            setLane(nextLane);
            setAuthenticated(false);
          }}
          onOpen={() => setAuthenticated(true)}
        />
      </ThemeProvider>
    );
  }

  const navigation = lane === 'sales' ? SALES_NAV : OPERATIONS_NAV;
  const section = lane === 'sales' ? salesSection : operationsSection;
  const identity = lane === 'sales' ? 'Abrar' : 'Fahim';

  return (
    <ThemeProvider colorScheme="light">
      <StyledReviewRoot>
        <StyledSidebar>
          <StyledBrand>
            <StyledMark>PE</StyledMark>
            <StyledBrandText>
              Prospect Engine
              <span>{lane === 'sales' ? 'Sales' : 'Operations'}</span>
            </StyledBrandText>
          </StyledBrand>

          <StyledNavLabel>
            {lane === 'sales' ? 'Sales' : 'Operations'}
          </StyledNavLabel>
          <StyledNav aria-label={`${identity} workspace navigation`}>
            {navigation.map((item) => (
              <StyledNavButton
                key={item.section}
                aria-current={item.section === section ? 'page' : undefined}
                data-active={item.section === section}
                onClick={() => {
                  if (lane === 'sales') {
                    setSalesSection(item.section as SalesWorkspaceSection);
                  } else {
                    setOperationsSection(
                      item.section as OperationsWorkspaceSection,
                    );
                  }
                }}
              >
                {item.label}
              </StyledNavButton>
            ))}
          </StyledNav>

          <StyledSidebarFooter>
            <StyledIdentity>
              {identity}
              <span>{lane === 'sales' ? 'Sales role' : 'Operations role'}</span>
            </StyledIdentity>
            <StyledLinkButton
              onClick={() => {
                setAuthenticated(false);
                setLane(null);
                setSalesSection('today');
                setOperationsSection('today');
              }}
            >
              Switch login
            </StyledLinkButton>
          </StyledSidebarFooter>
        </StyledSidebar>

        <StyledMain>
          <StyledReviewBadge>
            Approval preview · sample records · no production changes
          </StyledReviewBadge>
          {lane === 'sales' ? (
            <SalesWorkspace
              section={salesSection}
              data={salesReviewData}
              onPrepareMeeting={() =>
                notify('Preview only: production opens the preparation form.')
              }
              onCompleteMeeting={() =>
                notify('Preview only: production opens the outcome form.')
              }
              onUpdateOpportunity={() =>
                notify(
                  'Preview only: production opens the stage and structured handoff form.',
                )
              }
              onRecordCoachingLesson={() =>
                notify(
                  'Preview only: production saves one concrete improvement to the CRM.',
                )
              }
              onOpenRecord={() =>
                notify('Preview only: production opens the linked CRM record.')
              }
            />
          ) : (
            <OperationsWorkspace
              section={operationsSection}
              data={operationsReviewData}
              onPrepareMeeting={() =>
                notify('Preview only: production opens the preparation form.')
              }
              onCompleteMeeting={() =>
                notify('Preview only: production opens the outcome form.')
              }
              onTaskStatusChange={(change) =>
                notify(
                  `Preview only: production moves this task to ${change.status}; Done requires evidence.`,
                )
              }
              onAddUpdate={() =>
                notify(
                  'Preview only: production opens the verified update and evidence form.',
                )
              }
              onAcceptHandoff={() =>
                notify(
                  'Preview only: production accepts the handoff into Operations.',
                )
              }
              onReturnHandoff={() =>
                notify(
                  'Preview only: production sends the return reason to Sales.',
                )
              }
              onOpenRecord={() =>
                notify('Preview only: production opens the linked CRM record.')
              }
            />
          )}
        </StyledMain>

        {notice && <StyledToast role="status">{notice}</StyledToast>}
      </StyledReviewRoot>
    </ThemeProvider>
  );
};
