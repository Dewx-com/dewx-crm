import {
  buildCreateAssignedWorkInput,
  type TeamManagementAssignmentDraft,
} from '@/team-workspace/management/hooks/useTeamManagementActions';
import { type TeamManagementEmployee } from '@/team-workspace/management/utils/buildTeamManagementModel';

const employee = (
  lane: TeamManagementEmployee['lane'],
): TeamManagementEmployee => ({
  id: `${lane}-member`,
  name: lane === 'sales' ? 'Abrar' : 'Fahim',
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

const draft = (
  overrides: Partial<TeamManagementAssignmentDraft> = {},
): TeamManagementAssignmentDraft => ({
  employee: employee('sales'),
  title: '  Send   the follow-up  ',
  detail: '  Confirm the decision owner and record the reply.  ',
  dueAt: '2026-08-28T10:30:00.000Z',
  client: '  PROSPECTENGINE  ',
  idempotencyKey: '  team-owner:assignment:one  ',
  ...overrides,
});

describe('buildCreateAssignedWorkInput', () => {
  it('normalizes an owner assignment into the exact Sales command', () => {
    expect(
      buildCreateAssignedWorkInput({
        ...draft(),
        now: Date.parse('2026-08-27T00:00:00.000Z'),
      }),
    ).toEqual({
      lane: 'SALES',
      assigneeId: 'sales-member',
      title: 'Send the follow-up',
      detail: 'Confirm the decision owner and record the reply.',
      dueAt: '2026-08-28T10:30:00.000Z',
      client: 'PROSPECTENGINE',
      idempotencyKey: 'team-owner:assignment:one',
    });
  });

  it('maps Operations and omits an empty client scope', () => {
    expect(
      buildCreateAssignedWorkInput({
        ...draft({ employee: employee('operations'), client: '  ' }),
        now: Date.parse('2026-08-27T00:00:00.000Z'),
      }),
    ).toMatchObject({
      lane: 'OPERATIONS',
      assigneeId: 'operations-member',
    });
    expect(
      buildCreateAssignedWorkInput({
        ...draft({ employee: employee('operations'), client: '  ' }),
        now: Date.parse('2026-08-27T00:00:00.000Z'),
      }),
    ).not.toHaveProperty('client');
  });

  it('rejects missing work, invalid deadlines, and past deadlines', () => {
    expect(() =>
      buildCreateAssignedWorkInput({
        ...draft({ title: ' ' }),
        now: Date.parse('2026-08-27T00:00:00.000Z'),
      }),
    ).toThrow('Work title is required.');
    expect(() =>
      buildCreateAssignedWorkInput({
        ...draft({ dueAt: 'not-a-date' }),
        now: Date.parse('2026-08-27T00:00:00.000Z'),
      }),
    ).toThrow('Choose a valid due date and time.');
    expect(() =>
      buildCreateAssignedWorkInput({
        ...draft({ dueAt: '2026-08-26T23:59:59.000Z' }),
        now: Date.parse('2026-08-27T00:00:00.000Z'),
      }),
    ).toThrow('The due date must be in the future.');
  });
});
