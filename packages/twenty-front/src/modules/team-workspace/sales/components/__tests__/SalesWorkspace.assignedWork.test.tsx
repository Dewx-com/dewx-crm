import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SalesWorkspace } from '@/team-workspace/sales/components/SalesWorkspace';
import {
  type SalesTaskStatusChange,
  type SalesWorkspaceData,
} from '@/team-workspace/sales/types/sales-workspace.types';

const NOW = '2026-08-27T09:00:00.000Z';

const data: SalesWorkspaceData = {
  salespersonName: 'Abrar',
  meetings: [],
  opportunities: [],
  followUps: [
    {
      id: 'task-todo',
      title: 'Send the logistics case study',
      detail: 'Use the logistics one, not the dental one.',
      companyName: 'Aster Logistics',
      dueAt: '2026-08-27T15:00:00.000Z',
      status: 'todo',
    },
  ],
  coachingReviews: [],
};

const renderToday = (
  onTaskStatusChange?: (change: SalesTaskStatusChange) => void,
) =>
  render(
    <SalesWorkspace
      section="today"
      data={data}
      now={NOW}
      onPrepareMeeting={jest.fn()}
      onCompleteMeeting={jest.fn()}
      onUpdateOpportunity={jest.fn()}
      onOpenRecord={jest.fn()}
      onTaskStatusChange={onTaskStatusChange}
    />,
  );

describe('SalesWorkspace assigned work', () => {
  it('should enable and fire the action when a status handler is wired', async () => {
    const onTaskStatusChange = jest.fn();

    renderToday(onTaskStatusChange);

    const startWork = screen.getByRole('button', { name: /Start work/ });

    expect(startWork).toBeEnabled();

    await userEvent.click(startWork);

    expect(onTaskStatusChange).toHaveBeenCalledWith({
      taskId: 'task-todo',
      status: 'in-progress',
    });
  });

  it('should show the assignment detail the owner attached', () => {
    renderToday(jest.fn());

    expect(
      screen.getByText('Use the logistics one, not the dental one.'),
    ).toBeInTheDocument();
  });

  it('should disable the action when no status handler reaches the card', () => {
    renderToday();

    expect(screen.getByRole('button', { name: /Start work/ })).toBeDisabled();
  });
});
