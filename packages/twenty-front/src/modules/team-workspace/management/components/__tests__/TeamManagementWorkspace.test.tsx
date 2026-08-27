import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { TeamManagementWorkspace } from '@/team-workspace/management/components/TeamManagementWorkspace';
import {
  type TeamManagementEmployee,
  type TeamManagementModel,
  type TeamManagementTask,
} from '@/team-workspace/management/utils/buildTeamManagementModel';

const employee = (
  id: string,
  name: string,
  lane: TeamManagementEmployee['lane'],
): TeamManagementEmployee => ({
  id,
  name,
  lane,
  attention: 'clear',
  counts: {
    assigned: 0,
    open: 0,
    done: 0,
    evidenceGaps: 0,
    overdue: 0,
    blockers: 0,
    promises: 0,
  },
  tasks: [],
  nextFollowUp: null,
  nextMeeting: null,
  latestEvidence: null,
  coachingNote: null,
});

const unassignedTask = (id: string, title: string): TeamManagementTask => ({
  id,
  title,
  detail: null,
  status: 'TODO',
  dueAt: '2026-08-28T10:00:00.000Z',
  clientName: null,
  isOverdue: false,
  isBlocked: false,
  isClientPromise: false,
  hasCompletionEvidence: false,
});

const model: TeamManagementModel = {
  generatedAt: '2026-08-27T00:00:00.000Z',
  employees: [
    employee('sales-member', 'Abrar', 'sales'),
    employee('operations-member', 'Fahim', 'operations'),
  ],
  unassignedSales: [
    unassignedTask('sales-unassigned', 'Prepare discovery follow-up'),
  ],
  unassignedOperations: [
    unassignedTask('operations-unassigned', 'Confirm the delivery plan'),
  ],
};

describe('TeamManagementWorkspace', () => {
  it('opens assignment for the selected employee and shows both unassigned queues', async () => {
    const onAssignWork = jest.fn();

    render(
      <MemoryRouter>
        <TeamManagementWorkspace model={model} onAssignWork={onAssignWork} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Unassigned Sales work')).toBeInTheDocument();
    expect(screen.getByText('Unassigned Operations work')).toBeInTheDocument();

    const assignButtons = screen.getAllByRole('button', {
      name: /Assign work/,
    });
    expect(assignButtons).toHaveLength(2);

    await userEvent.click(assignButtons[0]);

    expect(onAssignWork).toHaveBeenCalledWith(model.employees[0]);
  });
});
