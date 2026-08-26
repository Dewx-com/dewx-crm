import { OperationsClientsSection } from './components/operations-clients-section';
import { OperationsMeetingsSection } from './components/operations-meetings-section';
import { OperationsTodaySection } from './components/operations-today-section';
import { OperationsWorkSection } from './components/operations-work-section';
import { type OperationsWorkspaceProps } from './operations-workspace-types';

export const OperationsWorkspace = ({
  section,
  data,
  now,
  onPrepareMeeting,
  onTaskStatusChange,
  onAddUpdate,
  onAcceptHandoff,
  onReturnHandoff,
  onOpenRecord,
}: OperationsWorkspaceProps) => {
  const callbacks = {
    onPrepareMeeting,
    onTaskStatusChange,
    onAddUpdate,
    onAcceptHandoff,
    onReturnHandoff,
    onOpenRecord,
  };

  switch (section) {
    case 'clients':
      return (
        <OperationsClientsSection data={data} now={now} callbacks={callbacks} />
      );
    case 'work':
      return (
        <OperationsWorkSection data={data} now={now} callbacks={callbacks} />
      );
    case 'meetings':
      return (
        <OperationsMeetingsSection
          data={data}
          now={now}
          callbacks={callbacks}
        />
      );
    case 'today':
      return (
        <OperationsTodaySection data={data} now={now} callbacks={callbacks} />
      );
  }
};
