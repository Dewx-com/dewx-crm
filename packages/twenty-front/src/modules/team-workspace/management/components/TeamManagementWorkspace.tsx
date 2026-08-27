import { styled } from '@linaria/react';
import { Link } from 'react-router-dom';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type TeamManagementEmployee,
  type TeamManagementModel,
  type TeamManagementTask,
} from '@/team-workspace/management/utils/buildTeamManagementModel';
import {
  StyledSalesSection,
  StyledSurface,
  StyledSurfaceBody,
  StyledSurfaceHeader,
  StyledSurfaceTitle,
} from '@/team-workspace/sales/components/SalesWorkspacePrimitives';

const StyledHeader = styled.header`
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledEyebrow = styled.div`
  color: ${themeCssVariables.color.blue9};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  margin-bottom: ${themeCssVariables.spacing[2]};
  text-transform: uppercase;
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.025em;
  margin: 0;
`;

const StyledLead = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.55;
  margin: ${themeCssVariables.spacing[2]} 0 0;
  max-width: 760px;
`;

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledEmployeeSurface = styled(StyledSurface)`
  min-width: 0;
`;

const StyledStatus = styled.span`
  background: ${themeCssVariables.background.transparent.success};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.color.green9};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &[data-attention='needs-attention'] {
    background: ${themeCssVariables.background.transparent.orange};
    color: ${themeCssVariables.color.orange11};
  }
`;

const StyledLane = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin-top: 2px;
`;

const StyledMetrics = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledMetric = styled.div`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing[3]};

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.xs};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.lg};
    font-weight: ${themeCssVariables.font.weight.semiBold};
    margin: ${themeCssVariables.spacing[1]} 0 0;
  }

  &[data-risk='true'] dd {
    color: ${themeCssVariables.font.color.danger};
  }
`;

const StyledFacts = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: ${themeCssVariables.spacing[4]};
  padding-top: ${themeCssVariables.spacing[4]};

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const StyledFact = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  min-width: 0;

  strong {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: ${themeCssVariables.font.size.xs};
    font-weight: ${themeCssVariables.font.weight.medium};
    margin-bottom: 2px;
  }
`;

const StyledFooter = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  margin-top: ${themeCssVariables.spacing[4]};
  padding-top: ${themeCssVariables.spacing[4]};
`;

const StyledQuietLink = styled(Link)`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  text-decoration: none;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
    text-decoration: underline;
  }
`;

const StyledCardActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledQueue = styled(StyledSurface)`
  margin-top: ${themeCssVariables.spacing[4]};
`;

const StyledDetailCard = styled.div`
  margin-top: ${themeCssVariables.spacing[4]};
`;

const StyledTaskList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledTask = styled.div`
  align-items: flex-start;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[5]};

  &:last-child {
    border-bottom: 0;
  }
`;

const StyledTaskTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledTaskDetail = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin-top: ${themeCssVariables.spacing[1]};
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const StyledTaskMeta = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  margin-top: 2px;
`;

const StyledTaskState = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};

  &[data-risk='true'] {
    color: ${themeCssVariables.font.color.danger};
  }
`;

const formatDateTime = (value: string | null): string => {
  if (!value || !Number.isFinite(Date.parse(value))) return 'No date';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const coachingEvidenceText = (
  employee: TeamManagementEmployee,
): string | null => {
  if (!employee.coachingNote) return null;

  return [
    employee.coachingNote.title,
    employee.coachingNote.detail !== employee.coachingNote.title
      ? employee.coachingNote.detail
      : null,
    employee.coachingNote.evidenceReference,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
};

const metric = (label: string, value: number, risk = false) => (
  <StyledMetric data-risk={risk && value > 0}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </StyledMetric>
);

const TaskRow = ({ task }: { task: TeamManagementTask }) => (
  <StyledTask>
    <div>
      <StyledTaskTitle>{task.title}</StyledTaskTitle>
      {task.detail && <StyledTaskDetail>{task.detail}</StyledTaskDetail>}
      <StyledTaskMeta>
        {task.clientName ?? 'Internal work'} · {formatDateTime(task.dueAt)}
        {task.isClientPromise ? ' · Client promise' : ''}
      </StyledTaskMeta>
    </div>
    <StyledTaskState data-risk={task.isOverdue || task.isBlocked}>
      {task.isBlocked
        ? 'Blocked'
        : task.isOverdue
          ? 'Overdue'
          : task.status === 'DONE'
            ? task.hasCompletionEvidence
              ? 'Done · verified'
              : 'Done · evidence missing'
            : task.status.toLowerCase()}
    </StyledTaskState>
  </StyledTask>
);

const EmployeeCard = ({
  employee,
  onAssignWork,
  detailed = false,
}: {
  employee: TeamManagementEmployee;
  onAssignWork: (employee: TeamManagementEmployee) => void;
  detailed?: boolean;
}) => (
  <StyledEmployeeSurface>
    <StyledSurfaceHeader>
      <div>
        <StyledSurfaceTitle>{employee.name}</StyledSurfaceTitle>
        <StyledLane>
          {employee.lane === 'sales' ? 'Sales' : 'Operations'}
        </StyledLane>
      </div>
      <StyledStatus data-attention={employee.attention}>
        {employee.attention === 'needs-attention'
          ? 'Needs attention'
          : 'No recorded issue'}
      </StyledStatus>
    </StyledSurfaceHeader>
    <StyledSurfaceBody>
      <StyledMetrics>
        {metric('Assigned', employee.counts.assigned)}
        {metric('Open', employee.counts.open)}
        {metric('Done', employee.counts.done)}
        {metric('Evidence gaps', employee.counts.evidenceGaps, true)}
        {metric('Overdue', employee.counts.overdue, true)}
        {metric('Blockers', employee.counts.blockers, true)}
        {metric('Promises', employee.counts.promises)}
      </StyledMetrics>

      <StyledFacts>
        <StyledFact>
          <strong>Next follow-up</strong>
          {employee.nextFollowUp
            ? [
                employee.nextFollowUp.title,
                employee.nextFollowUp.clientName,
                formatDateTime(employee.nextFollowUp.dueAt),
              ]
                .filter(Boolean)
                .join(' · ')
            : 'No dated open follow-up is recorded.'}
        </StyledFact>
        <StyledFact>
          <strong>Next meeting</strong>
          {employee.nextMeeting
            ? [
                employee.nextMeeting.title,
                employee.nextMeeting.clientName,
                formatDateTime(employee.nextMeeting.startsAt),
              ]
                .filter(Boolean)
                .join(' · ')
            : 'No upcoming meeting is recorded.'}
        </StyledFact>
        <StyledFact>
          <strong>Latest delivery evidence</strong>
          {employee.latestEvidence
            ? `${employee.latestEvidence.summary} · ${employee.latestEvidence.source}`
            : 'No verified completion evidence is recorded.'}
        </StyledFact>
        <StyledFact>
          <strong>Call coaching evidence</strong>
          {coachingEvidenceText(employee)
            ? coachingEvidenceText(employee)
            : employee.lane === 'sales'
              ? 'No evidence-backed coaching note is available.'
              : 'Call coaching is not part of the Operations lane.'}
        </StyledFact>
      </StyledFacts>

      {!detailed && (
        <StyledFooter>
          <span />
          <StyledCardActions>
            <StyledQuietLink to={`/team/management/member/${employee.id}`}>
              Review work
            </StyledQuietLink>
            <Button
              title="Assign work"
              variant="primary"
              accent="blue"
              onClick={() => onAssignWork(employee)}
            />
          </StyledCardActions>
        </StyledFooter>
      )}
    </StyledSurfaceBody>
    {detailed && employee.tasks.length > 0 && (
      <StyledTaskList>
        {employee.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </StyledTaskList>
    )}
  </StyledEmployeeSurface>
);

const UnassignedQueue = ({
  title,
  tasks,
}: {
  title: string;
  tasks: TeamManagementTask[];
}) => {
  if (tasks.length === 0) return null;

  return (
    <StyledQueue>
      <StyledSurfaceHeader>
        <StyledSurfaceTitle>{title}</StyledSurfaceTitle>
        <StyledStatus data-attention="needs-attention">
          {tasks.length}
        </StyledStatus>
      </StyledSurfaceHeader>
      <StyledTaskList>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </StyledTaskList>
    </StyledQueue>
  );
};

export const TeamManagementWorkspace = ({
  model,
  selectedMemberId,
  onAssignWork,
}: {
  model: TeamManagementModel;
  selectedMemberId?: string;
  onAssignWork: (employee: TeamManagementEmployee) => void;
}) => {
  const selectedEmployee = selectedMemberId
    ? model.employees.find((employee) => employee.id === selectedMemberId)
    : null;

  if (selectedMemberId && selectedEmployee) {
    return (
      <StyledSalesSection>
        <StyledHeader>
          <StyledEyebrow>Private owner view</StyledEyebrow>
          <StyledTitle>{selectedEmployee.name}</StyledTitle>
          <StyledLead>
            Evidence-backed work status for this team member. Private review
            notes are not stored in Phase 1, so this page does not invent or
            expose unverified judgments. Snapshot generated{' '}
            {formatDateTime(model.generatedAt)}.
          </StyledLead>
        </StyledHeader>
        <StyledFooter>
          <StyledQuietLink to="/team/management/overview">
            Back to team overview
          </StyledQuietLink>
          <StyledCardActions>
            <StyledQuietLink to={`/team/${selectedEmployee.lane}/today`}>
              Open {selectedEmployee.lane} workspace
            </StyledQuietLink>
            <Button
              title="Assign work"
              variant="primary"
              accent="blue"
              onClick={() => onAssignWork(selectedEmployee)}
            />
          </StyledCardActions>
        </StyledFooter>
        <StyledDetailCard>
          <EmployeeCard
            employee={selectedEmployee}
            onAssignWork={onAssignWork}
            detailed
          />
        </StyledDetailCard>
      </StyledSalesSection>
    );
  }

  return (
    <StyledSalesSection>
      <StyledHeader>
        <StyledEyebrow>Private owner view</StyledEyebrow>
        <StyledTitle>Team management</StyledTitle>
        <StyledLead>
          Follow the work, promises, blockers, meetings, and evidence recorded
          for each employee. Missing data stays visible as missing. Snapshot
          generated {formatDateTime(model.generatedAt)}.
        </StyledLead>
      </StyledHeader>

      <StyledGrid>
        {model.employees.map((employee) => (
          <EmployeeCard
            key={`${employee.lane}-${employee.id}`}
            employee={employee}
            onAssignWork={onAssignWork}
          />
        ))}
      </StyledGrid>

      <UnassignedQueue
        title="Unassigned Sales work"
        tasks={model.unassignedSales}
      />
      <UnassignedQueue
        title="Unassigned Operations work"
        tasks={model.unassignedOperations}
      />
    </StyledSalesSection>
  );
};
