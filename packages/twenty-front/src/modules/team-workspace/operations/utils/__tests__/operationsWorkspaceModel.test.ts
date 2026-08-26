import {
  buildClientRows,
  buildOperationsToday,
  canMarkTaskDone,
  clientsNeedingVerifiedUpdate,
  groupTasksByStatus,
  isVerifiedUpdate,
} from '@/team-workspace/operations/utils/operationsWorkspaceModel';
import {
  type OperationsClient,
  type OperationsClientUpdate,
  type OperationsMeeting,
  type OperationsTask,
  type OperationsWorkspaceData,
} from '@/team-workspace/operations/operations-workspace-types';

const NOW = new Date('2026-08-26T09:00:00.000Z');

const client = (
  overrides: Partial<OperationsClient> = {},
): OperationsClient => ({
  id: 'client-1',
  name: 'Northstar Labs',
  status: 'active',
  health: 'healthy',
  ownerName: 'Fahim',
  ...overrides,
});

const task = (overrides: Partial<OperationsTask> = {}): OperationsTask => ({
  id: 'task-1',
  title: 'Send the verified weekly update',
  clientId: 'client-1',
  clientName: 'Northstar Labs',
  ownerId: 'fahim',
  ownerName: 'Fahim',
  status: 'todo',
  priority: 'normal',
  dueAt: '2026-08-27T09:00:00.000Z',
  isClientPromise: false,
  blockedReason: null,
  updatedAt: '2026-08-25T09:00:00.000Z',
  completionEvidence: null,
  ...overrides,
});

const update = (
  overrides: Partial<OperationsClientUpdate> = {},
): OperationsClientUpdate => ({
  id: 'update-1',
  clientId: 'client-1',
  clientName: 'Northstar Labs',
  summary: 'Target list approved and campaign QA passed.',
  status: 'verified',
  occurredAt: '2026-08-24T09:00:00.000Z',
  verifiedAt: '2026-08-24T10:00:00.000Z',
  verifiedBy: 'Fahim',
  evidenceRef: 'docref://client-1/update-1',
  ...overrides,
});

const meeting = (
  overrides: Partial<OperationsMeeting> = {},
): OperationsMeeting => ({
  id: 'meeting-1',
  clientId: 'client-1',
  clientName: 'Northstar Labs',
  title: 'Weekly client review',
  startsAt: '2026-08-27T09:00:00.000Z',
  endsAt: '2026-08-27T09:30:00.000Z',
  ownerName: 'Fahim',
  participants: ['Amina Rahman'],
  purpose: 'Agree next campaign batch',
  prepStatus: 'not-started',
  prepSummary: null,
  previousMeetingSummary: null,
  joinUrl: null,
  status: 'scheduled',
  ...overrides,
});

const data = (
  overrides: Partial<OperationsWorkspaceData> = {},
): OperationsWorkspaceData => ({
  viewer: { id: 'fahim', name: 'Fahim' },
  clients: [client()],
  tasks: [],
  meetings: [],
  updates: [],
  handoffs: [],
  ...overrides,
});

describe('operations workspace model', () => {
  it('requires useful evidence before a task can be marked done', () => {
    expect(canMarkTaskDone(task())).toBe(false);
    expect(
      canMarkTaskDone(
        task({
          completionEvidence: {
            summary: 'QA checklist passed.',
            sourceRef: 'docref://client-1/qa-1',
            recordedAt: '2026-08-26T08:00:00.000Z',
            recordedBy: 'Fahim',
          },
        }),
      ),
    ).toBe(true);
  });

  it('does not treat an unverified or unevidenced update as verified', () => {
    expect(isVerifiedUpdate(update())).toBe(true);
    expect(isVerifiedUpdate(update({ evidenceRef: null }))).toBe(false);
    expect(isVerifiedUpdate(update({ status: 'draft' }))).toBe(false);
  });

  it('puts stale and missing client updates into the review queue', () => {
    const rows = clientsNeedingVerifiedUpdate(
      {
        clients: [
          client({ id: 'missing', name: 'Missing Update' }),
          client({ id: 'stale', name: 'Stale Update' }),
          client({ id: 'fresh', name: 'Fresh Update' }),
          client({ id: 'paused', name: 'Paused Client', status: 'paused' }),
          client({
            id: 'unknown',
            name: 'Unclassified Client',
            status: 'unknown',
          }),
        ],
        updates: [
          update({
            id: 'stale-update',
            clientId: 'stale',
            verifiedAt: '2026-08-10T09:00:00.000Z',
          }),
          update({
            id: 'fresh-update',
            clientId: 'fresh',
            verifiedAt: '2026-08-25T09:00:00.000Z',
          }),
        ],
      },
      NOW,
    );

    expect(rows.map((row) => row.client.id).sort()).toEqual([
      'missing',
      'stale',
    ]);
  });

  it('builds Today around overdue promises, blocked work, and the next meeting', () => {
    const today = buildOperationsToday(
      data({
        tasks: [
          task({
            id: 'promise',
            title: 'Deliver revised targeting',
            priority: 'urgent',
            dueAt: '2026-08-25T09:00:00.000Z',
            isClientPromise: true,
          }),
          task({
            id: 'blocked',
            title: 'Launch campaign',
            status: 'blocked',
            blockedReason: 'Waiting for target-list approval',
          }),
        ],
        meetings: [
          meeting({ id: 'later', startsAt: '2026-08-28T09:00:00.000Z' }),
          meeting({ id: 'next', startsAt: '2026-08-27T09:00:00.000Z' }),
        ],
        handoffs: [
          {
            id: 'handoff-1',
            title: 'Take over weekly report',
            clientId: 'client-1',
            clientName: 'Northstar Labs',
            fromName: 'Abrar',
            toUserId: 'fahim',
            toName: 'Fahim',
            context: 'Sales call completed.',
            createdAt: '2026-08-26T07:00:00.000Z',
            dueAt: null,
            status: 'pending',
          },
        ],
      }),
      NOW,
    );

    expect(today.overduePromises.map(({ id }) => id)).toEqual(['promise']);
    expect(today.blockedWork.map(({ id }) => id)).toEqual(['blocked']);
    expect(today.nextMeeting?.id).toBe('next');
    expect(today.pendingHandoffs.map(({ id }) => id)).toEqual(['handoff-1']);
  });

  it('groups the work board and keeps the most urgent task first', () => {
    const grouped = groupTasksByStatus([
      task({ id: 'normal', priority: 'normal' }),
      task({ id: 'urgent', priority: 'urgent' }),
      task({ id: 'doing', status: 'in-progress' }),
      task({ id: 'blocked', status: 'blocked' }),
      task({ id: 'done', status: 'done' }),
    ]);

    expect(grouped.todo.map(({ id }) => id)).toEqual(['urgent', 'normal']);
    expect(grouped['in-progress']).toHaveLength(1);
    expect(grouped.blocked).toHaveLength(1);
    expect(grouped.done).toHaveLength(1);
  });

  it('derives each client next action and latest verified update', () => {
    const rows = buildClientRows({
      clients: [client()],
      tasks: [
        task({ id: 'later', dueAt: '2026-08-29T09:00:00.000Z' }),
        task({ id: 'sooner', dueAt: '2026-08-27T09:00:00.000Z' }),
      ],
      updates: [
        update({ id: 'older', verifiedAt: '2026-08-20T09:00:00.000Z' }),
        update({ id: 'newer', verifiedAt: '2026-08-24T09:00:00.000Z' }),
      ],
    });

    expect(rows[0].nextAction?.id).toBe('sooner');
    expect(rows[0].lastVerifiedUpdate?.id).toBe('newer');
  });
});
