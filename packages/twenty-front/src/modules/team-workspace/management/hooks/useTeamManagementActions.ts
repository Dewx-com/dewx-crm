import { useMutation } from '@apollo/client/react';

import { type TeamManagementEmployee } from '@/team-workspace/management/utils/buildTeamManagementModel';
import {
  CREATE_ASSIGNED_WORK,
  type CreateAssignedWorkInput,
  type TeamWorkspaceCommandReceipt,
} from '@/team-workspace/shared/graphql/mutations/teamWorkspaceCommands';
import { compactText } from '@/team-workspace/shared/utils/teamWorkspaceRecordModel';

export type TeamManagementAssignmentDraft = {
  employee: TeamManagementEmployee;
  title: string;
  detail: string;
  dueAt: string;
  client: string;
  idempotencyKey: string;
};

export const buildCreateAssignedWorkInput = ({
  employee,
  title,
  detail,
  dueAt,
  client,
  idempotencyKey,
  now = Date.now(),
}: TeamManagementAssignmentDraft & {
  now?: number;
}): CreateAssignedWorkInput => {
  const cleanTitle = compactText(title);
  const cleanDetail = detail.trim();
  const dueTimestamp = Date.parse(dueAt);

  if (!cleanTitle) throw new Error('Work title is required.');
  if (cleanTitle.length > 180) {
    throw new Error('Work title must be 180 characters or fewer.');
  }
  if (!cleanDetail) throw new Error('Work details are required.');
  if (cleanDetail.length > 12_000) {
    throw new Error('Work details must be 12,000 characters or fewer.');
  }
  if (!Number.isFinite(dueTimestamp)) {
    throw new Error('Choose a valid due date and time.');
  }
  if (dueTimestamp <= now) {
    throw new Error('The due date must be in the future.');
  }
  if (!compactText(idempotencyKey)) {
    throw new Error('This assignment has no request key. Close it and retry.');
  }

  const cleanClient = compactText(client);

  return {
    lane: employee.lane === 'sales' ? 'SALES' : 'OPERATIONS',
    assigneeId: employee.id,
    title: cleanTitle,
    detail: cleanDetail,
    dueAt: new Date(dueTimestamp).toISOString(),
    ...(cleanClient ? { client: cleanClient } : {}),
    idempotencyKey: compactText(idempotencyKey),
  };
};

export const useTeamManagementActions = () => {
  const [runCreateAssignedWork, state] = useMutation<
    { createAssignedWork: TeamWorkspaceCommandReceipt },
    { input: CreateAssignedWorkInput }
  >(CREATE_ASSIGNED_WORK);

  const createAssignedWork = (draft: TeamManagementAssignmentDraft) =>
    runCreateAssignedWork({
      variables: { input: buildCreateAssignedWorkInput(draft) },
    });

  return { createAssignedWork, loading: state.loading };
};
