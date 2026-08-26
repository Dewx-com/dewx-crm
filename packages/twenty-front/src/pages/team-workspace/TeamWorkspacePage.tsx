import { styled } from '@linaria/react';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import {
  OperationsWorkspace,
  type OperationsTaskStatusChange,
} from '@/team-workspace/operations';
import {
  canRolesEnterTeamWorkspaceLane,
  teamWorkspaceLanesFromRoles,
} from '@/team-workspace/role/utils/teamWorkspaceRoleAccess';
import {
  isTeamWorkspaceLane,
  type TeamWorkspaceLane,
} from '@/team-workspace/role/types/TeamWorkspaceLane';
import {
  SalesWorkspace,
  type SalesTaskStatusChange,
} from '@/team-workspace/sales';
import {
  TEAM_WORKSPACE_ACTION_MODAL_ID,
  TeamWorkspaceActionModal,
  type TeamWorkspaceActionRequest,
} from '@/team-workspace/shared/components/TeamWorkspaceActionModal';
import { TEAM_RECORD_PREFIX } from '@/team-workspace/shared/constants/teamWorkspaceRecordConventions';
import { useTeamWorkspaceActions } from '@/team-workspace/shared/hooks/useTeamWorkspaceActions';
import { useTeamWorkspaceRecords } from '@/team-workspace/shared/hooks/useTeamWorkspaceRecords';
import {
  fullName,
  hasRecordPrefix,
} from '@/team-workspace/shared/utils/teamWorkspaceRecordModel';
import {
  isTeamWorkspaceSectionForLane,
  teamWorkspacePath,
} from '@/team-workspace/shared/utils/teamWorkspaceRoutes';
import {
  buildOperationsWorkspaceData,
  buildSalesWorkspaceData,
} from '@/team-workspace/shared/utils/teamWorkspaceViewData';

const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledState = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 1;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
  line-height: 1.5;
  margin: 0 auto;
  max-width: 560px;
  padding: ${themeCssVariables.spacing[8]};
`;

const StyledStateTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledDataNotice = styled.div`
  background: ${themeCssVariables.background.transparent.danger};
  border-bottom: 1px solid ${themeCssVariables.border.color.danger};
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[6]};
`;

export const TeamWorkspacePage = () => {
  const { lane: laneParam, section: sectionParam } = useParams<{
    lane: string;
    section: string;
  }>();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const isTeamWorkspaceDomain =
    workspacePublicData?.isTeamWorkspaceDomainAlias === true;
  const roles = currentWorkspaceMember?.roles;
  const allowedLanes = teamWorkspaceLanesFromRoles(roles);
  const requestedLane = isTeamWorkspaceLane(laneParam) ? laneParam : null;
  const lane: TeamWorkspaceLane = requestedLane ?? allowedLanes[0] ?? 'sales';
  const isAuthorized = canRolesEnterTeamWorkspaceLane({ roles, lane });
  const recordsQuery = useTeamWorkspaceRecords(
    lane,
    !isAuthorized || !isTeamWorkspaceDomain,
    currentWorkspaceMember?.id,
  );
  const mutations = useTeamWorkspaceActions(lane);
  const { openModal } = useModal();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [action, setAction] = useState<TeamWorkspaceActionRequest | null>(null);
  const now = useMemo(() => new Date(), []);

  const section = isTeamWorkspaceSectionForLane({
    lane,
    section: sectionParam,
  })
    ? sectionParam
    : 'today';

  const viewerName = fullName(currentWorkspaceMember?.name) || 'Team member';
  const salesData = useMemo(
    () =>
      buildSalesWorkspaceData({
        records: recordsQuery.records,
        salespersonName: viewerName,
        now,
        timeZone: currentWorkspaceMember?.timeZone ?? undefined,
      }),
    [currentWorkspaceMember?.timeZone, now, recordsQuery.records, viewerName],
  );
  const operationsData = useMemo(
    () =>
      buildOperationsWorkspaceData({
        records: recordsQuery.records,
        viewer: {
          id: currentWorkspaceMember?.id ?? 'unknown-member',
          name: viewerName,
        },
        now,
      }),
    [currentWorkspaceMember?.id, now, recordsQuery.records, viewerName],
  );

  const showAction = (nextAction: TeamWorkspaceActionRequest) => {
    setAction(nextAction);
    openModal(TEAM_WORKSPACE_ACTION_MODAL_ID);
  };

  const runDirectUpdate = async (
    operation: () => Promise<unknown>,
    successMessage: string,
  ) => {
    try {
      await operation();
    } catch (caught) {
      enqueueErrorSnackBar({
        message:
          caught instanceof Error
            ? caught.message
            : 'The update could not be saved.',
      });
      return;
    }

    try {
      await recordsQuery.refetch();
      enqueueSuccessSnackBar({ message: successMessage });
    } catch {
      enqueueErrorSnackBar({
        message:
          'The change was saved, but the live view could not refresh. Reload before retrying.',
      });
    }
  };

  const handleSaved = async (message: string) => {
    try {
      await recordsQuery.refetch();
      enqueueSuccessSnackBar({ message });
    } catch {
      enqueueErrorSnackBar({
        message:
          'The change was saved, but the live view could not refresh. Reload before retrying.',
      });
    }
  };

  const explainSafeProjection = () =>
    enqueueSuccessSnackBar({
      message:
        'All details available to this role are already shown in the secure team workspace.',
    });

  const updateSalesTask = (change: SalesTaskStatusChange) => {
    const task = recordsQuery.records.tasks.find(
      (candidate) => candidate.id === change.taskId,
    );
    if (!task) {
      enqueueErrorSnackBar({ message: 'This task is no longer available.' });
      return;
    }

    if (change.status === 'done') {
      showAction({ kind: 'task-finish', taskId: task.id });
      return;
    }

    void runDirectUpdate(
      () =>
        mutations.updateTaskStatus({
          task,
          status: change.status === 'in-progress' ? 'IN_PROGRESS' : 'TODO',
        }),
      change.status === 'in-progress' ? 'Work started.' : 'Task moved to do.',
    );
  };

  const updateOperationsTask = (change: OperationsTaskStatusChange) => {
    const task = recordsQuery.records.tasks.find(
      (candidate) => candidate.id === change.taskId,
    );
    if (!task) {
      enqueueErrorSnackBar({ message: 'This task is no longer available.' });
      return;
    }

    if (change.status === 'blocked') {
      showAction({ kind: 'task-block', taskId: task.id });
      return;
    }
    if (change.status === 'done') {
      if (change.evidence === undefined) {
        showAction({ kind: 'task-finish', taskId: task.id });
        return;
      }
      void runDirectUpdate(
        () =>
          mutations.updateTaskStatus({
            task,
            status: 'DONE',
            completionEvidence: `${change.evidence.summary}\n\nSource: ${change.evidence.sourceRef}`,
          }),
        'Task finished with completion evidence.',
      );
      return;
    }
    if (
      change.status === 'in-progress' &&
      hasRecordPrefix(task, TEAM_RECORD_PREFIX.blocker)
    ) {
      void runDirectUpdate(
        () => mutations.resolveBlocker(task),
        'Blocker cleared; the original work can continue.',
      );
      return;
    }

    void runDirectUpdate(
      () =>
        mutations.updateTaskStatus({
          task,
          status: change.status === 'in-progress' ? 'IN_PROGRESS' : 'TODO',
        }),
      change.status === 'in-progress' ? 'Work started.' : 'Task moved to do.',
    );
  };

  if (!currentWorkspaceMember || !workspacePublicData) {
    return (
      <StyledPage>
        <StyledState>Loading your workspace role…</StyledState>
      </StyledPage>
    );
  }

  if (!isTeamWorkspaceDomain) {
    return <Navigate replace to="/" />;
  }

  if (allowedLanes.length === 0) {
    return (
      <StyledPage>
        <StyledState>
          <StyledStateTitle>Work area not assigned</StyledStateTitle>
          Your account is authenticated, but it has no Sales, Operations, or
          Admin role. Ask an administrator to assign the correct role.
        </StyledState>
      </StyledPage>
    );
  }

  if (!requestedLane || !isAuthorized) {
    return (
      <Navigate
        replace
        to={teamWorkspacePath({ lane: allowedLanes[0], section: 'today' })}
      />
    );
  }

  if (!isTeamWorkspaceSectionForLane({ lane, section: sectionParam })) {
    return <Navigate replace to={teamWorkspacePath({ lane, section })} />;
  }

  return (
    <StyledPage>
      {recordsQuery.errors.length > 0 && (
        <StyledDataNotice role="alert">
          Some CRM records could not be loaded. The page is showing only the
          records the server returned; reload before making a decision from a
          count.
        </StyledDataNotice>
      )}

      {recordsQuery.loading &&
      recordsQuery.records.tasks.length === 0 &&
      recordsQuery.records.meetings.length === 0 ? (
        <StyledState>Loading the live CRM records…</StyledState>
      ) : lane === 'sales' ? (
        <SalesWorkspace
          section={
            section as 'today' | 'meetings' | 'pipeline' | 'call-coaching'
          }
          data={salesData}
          now={now.toISOString()}
          onPrepareMeeting={(meetingId) =>
            showAction({ kind: 'meeting-prep', meetingId })
          }
          onCompleteMeeting={(meetingId) =>
            showAction({ kind: 'meeting-outcome', meetingId })
          }
          onUpdateOpportunity={(opportunityId) =>
            showAction({ kind: 'opportunity-update', opportunityId })
          }
          onRecordCoachingLesson={(recordingId) =>
            showAction({ kind: 'coaching-lesson', recordingId })
          }
          onOpenRecord={explainSafeProjection}
          onTaskStatusChange={updateSalesTask}
        />
      ) : (
        <OperationsWorkspace
          section={section as 'today' | 'clients' | 'work' | 'meetings'}
          data={operationsData}
          now={now}
          onPrepareMeeting={(meetingId) =>
            showAction({ kind: 'meeting-prep', meetingId })
          }
          onCompleteMeeting={(meetingId) =>
            showAction({ kind: 'meeting-outcome', meetingId })
          }
          onTaskStatusChange={updateOperationsTask}
          onAddUpdate={(clientId) =>
            showAction({ kind: 'client-update', clientId })
          }
          onAcceptHandoff={(handoffId) => {
            const handoff = recordsQuery.records.handoffs.find(
              (candidate) => candidate.id === handoffId,
            );
            if (!handoff) {
              enqueueErrorSnackBar({
                message: 'This handoff is no longer available.',
              });
              return;
            }
            void runDirectUpdate(
              () => mutations.acceptHandoff(handoff),
              'Handoff accepted and moved into Operations work.',
            );
          }}
          onReturnHandoff={(handoffId) =>
            showAction({ kind: 'handoff-return', handoffId })
          }
          onOpenRecord={explainSafeProjection}
        />
      )}

      {action && (
        <TeamWorkspaceActionModal
          key={`${action.kind}-${'meetingId' in action ? action.meetingId : 'opportunityId' in action ? action.opportunityId : 'recordingId' in action ? action.recordingId : 'clientId' in action ? action.clientId : 'taskId' in action ? action.taskId : action.handoffId}`}
          action={action}
          lane={lane}
          records={recordsQuery.records}
          onSaved={handleSaved}
          onClose={() => setAction(null)}
        />
      )}
    </StyledPage>
  );
};
