export type OperationsWorkspaceSection =
  | 'today'
  | 'clients'
  | 'work'
  | 'meetings';

export type OperationsHealth = 'healthy' | 'watch' | 'at-risk' | 'unknown';

export type OperationsClientStatus =
  | 'onboarding'
  | 'active'
  | 'paused'
  | 'ended'
  | 'unknown';

export type OperationsTaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';

export type OperationsTaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export type OperationsPrepStatus = 'not-started' | 'in-progress' | 'ready';

export type OperationsEvidence = {
  summary: string;
  sourceRef: string;
  recordedAt: string;
  recordedBy: string;
};

export type OperationsViewer = {
  id: string;
  name: string;
};

export type OperationsClient = {
  id: string;
  name: string;
  status: OperationsClientStatus;
  health: OperationsHealth;
  ownerName: string | null;
};

export type OperationsTask = {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  status: OperationsTaskStatus;
  priority: OperationsTaskPriority;
  dueAt: string | null;
  isClientPromise: boolean;
  blockedReason: string | null;
  updatedAt: string;
  completionEvidence: OperationsEvidence | null;
};

export type OperationsMeeting = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  ownerName: string | null;
  participants: string[];
  purpose: string | null;
  prepStatus: OperationsPrepStatus;
  prepSummary: string | null;
  previousMeetingSummary: string | null;
  joinUrl: string | null;
  status:
    | 'scheduled'
    | 'completed'
    | 'outcome-missing'
    | 'no-show'
    | 'rescheduled'
    | 'cancelled';
};

export type OperationsClientUpdate = {
  id: string;
  clientId: string;
  clientName: string;
  summary: string;
  status: 'draft' | 'verified';
  occurredAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  evidenceRef: string | null;
};

export type OperationsHandoff = {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string | null;
  fromName: string;
  toUserId: string;
  toName: string;
  context: string | null;
  createdAt: string;
  dueAt: string | null;
  status: 'pending' | 'accepted' | 'returned';
};

export type OperationsWorkspaceData = {
  viewer: OperationsViewer;
  clients: OperationsClient[];
  tasks: OperationsTask[];
  meetings: OperationsMeeting[];
  updates: OperationsClientUpdate[];
  handoffs: OperationsHandoff[];
};

export type OperationsRecordTarget = {
  kind: 'client' | 'task' | 'meeting' | 'handoff' | 'update';
  id: string;
};

export type OperationsTaskStatusChange =
  | {
      taskId: string;
      status: Exclude<OperationsTaskStatus, 'done'>;
    }
  | {
      taskId: string;
      status: 'done';
      evidence: OperationsEvidence;
    };

export type OperationsWorkspaceCallbacks = {
  onPrepareMeeting?: (meetingId: string) => void;
  onCompleteMeeting?: (meetingId: string) => void;
  onTaskStatusChange?: (change: OperationsTaskStatusChange) => void;
  onAddUpdate?: (clientId: string) => void;
  onAcceptHandoff?: (handoffId: string) => void;
  onReturnHandoff?: (handoffId: string) => void;
  onOpenRecord?: (target: OperationsRecordTarget) => void;
};

export type OperationsWorkspaceProps = OperationsWorkspaceCallbacks & {
  section: OperationsWorkspaceSection;
  data: OperationsWorkspaceData;
  now?: Date;
};
