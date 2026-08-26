import {
  buildSalesPipelineRows,
  buildSalesWorkspaceModel,
  getSalesCoachingAvailability,
} from '@/team-workspace/sales/utils/buildSalesWorkspaceModel';
import {
  type SalesCoachingReview,
  type SalesWorkspaceData,
} from '@/team-workspace/sales/types/sales-workspace.types';

const NOW = '2026-08-26T08:00:00.000Z';

const buildData = (): SalesWorkspaceData => ({
  salespersonName: 'Abrar',
  meetings: [
    {
      id: 'meeting-later',
      contactName: 'Mina Cole',
      companyName: 'Northstar',
      startsAt: '2026-08-26T12:00:00.000Z',
      durationMinutes: 30,
      timezoneLabel: 'UTC',
      kind: 'discovery',
      status: 'scheduled',
      preparationStatus: 'not-started',
      opportunityId: 'opportunity-1',
    },
    {
      id: 'meeting-next',
      contactName: 'Sam Lee',
      companyName: 'Mariner',
      startsAt: '2026-08-26T09:00:00.000Z',
      durationMinutes: 30,
      timezoneLabel: 'UTC',
      kind: 'qualification',
      status: 'prepared',
      preparationStatus: 'ready',
      opportunityId: 'opportunity-2',
    },
    {
      id: 'meeting-cancelled',
      contactName: 'Ira Noor',
      companyName: 'Beacon',
      startsAt: '2026-08-26T08:30:00.000Z',
      durationMinutes: 30,
      timezoneLabel: 'UTC',
      kind: 'discovery',
      status: 'cancelled',
      preparationStatus: 'not-started',
    },
    {
      id: 'meeting-past',
      contactName: 'Mina Cole',
      companyName: 'Northstar',
      startsAt: '2026-08-24T12:00:00.000Z',
      durationMinutes: 30,
      timezoneLabel: 'UTC',
      kind: 'discovery',
      status: 'attended',
      preparationStatus: 'ready',
      opportunityId: 'opportunity-1',
      outcome: 'Asked for a scoped proposal.',
    },
    {
      id: 'meeting-unknown-outcome',
      contactName: 'Sam Lee',
      companyName: 'Mariner',
      startsAt: '2026-08-25T12:00:00.000Z',
      durationMinutes: 30,
      timezoneLabel: 'UTC',
      kind: 'discovery',
      status: 'outcome-missing',
      preparationStatus: 'ready',
      opportunityId: 'opportunity-2',
    },
  ],
  opportunities: [
    {
      id: 'opportunity-1',
      contactName: 'Mina Cole',
      companyName: 'Northstar',
      stage: 'proposal',
      nextAction: 'Send the agreed scope.',
    },
    {
      id: 'opportunity-2',
      contactName: 'Sam Lee',
      companyName: 'Mariner',
      stage: 'qualified',
      nextAction: 'Confirm the decision process.',
    },
  ],
  followUps: [
    {
      id: 'follow-up-overdue',
      title: 'Send the case study',
      companyName: 'Northstar',
      dueAt: '2026-08-25T12:00:00.000Z',
      status: 'open',
      opportunityId: 'opportunity-1',
    },
    {
      id: 'follow-up-done',
      title: 'Confirm the guest list',
      companyName: 'Mariner',
      dueAt: '2026-08-25T13:00:00.000Z',
      status: 'done',
    },
  ],
  coachingReviews: [],
});

describe('buildSalesWorkspaceModel', () => {
  it('should choose the nearest active meeting and exclude cancelled meetings', () => {
    const model = buildSalesWorkspaceModel(buildData(), NOW);

    expect(model.nextMeeting?.id).toBe('meeting-next');
    expect(model.upcomingMeetings.map((meeting) => meeting.id)).toEqual([
      'meeting-next',
      'meeting-later',
    ]);
  });

  it('should include only open follow-ups whose due time has passed', () => {
    const model = buildSalesWorkspaceModel(buildData(), NOW);

    expect(model.overdueFollowUps.map((followUp) => followUp.id)).toEqual([
      'follow-up-overdue',
    ]);
  });
});

describe('buildSalesPipelineRows', () => {
  it('should connect each opportunity to its latest outcome and next meeting', () => {
    const data = buildData();
    const [row] = buildSalesPipelineRows(
      data.opportunities,
      data.meetings,
      NOW,
    );

    expect(row.lastMeeting?.id).toBe('meeting-past');
    expect(row.lastMeeting?.outcome).toBe('Asked for a scoped proposal.');
    expect(row.nextMeeting?.id).toBe('meeting-later');
  });

  it('should not infer attendance from a past event with a missing outcome', () => {
    const data = buildData();
    const row = buildSalesPipelineRows(
      data.opportunities,
      data.meetings,
      NOW,
    ).find(({ opportunity }) => opportunity.id === 'opportunity-2');

    expect(row?.lastMeeting).toBeUndefined();
    expect(row?.latestPastMeeting).toMatchObject({
      id: 'meeting-unknown-outcome',
      status: 'outcome-missing',
    });
    expect(row?.latestPastMeeting?.outcome).toBeUndefined();
  });
});

describe('getSalesCoachingAvailability', () => {
  it('should make coaching unavailable when the transcript is missing', () => {
    const review: SalesCoachingReview = {
      id: 'review-1',
      meetingId: 'meeting-past',
      contactName: 'Mina Cole',
      companyName: 'Northstar',
      occurredAt: '2026-08-24T12:00:00.000Z',
      transcriptStatus: 'missing',
      summary: 'This text must not be shown as evidence-backed coaching.',
    };

    expect(getSalesCoachingAvailability(review)).toEqual({
      isAvailable: false,
      reason: 'missing-transcript',
    });
  });

  it('should require a supplied summary and cited evidence', () => {
    const review: SalesCoachingReview = {
      id: 'review-2',
      meetingId: 'meeting-past',
      contactName: 'Mina Cole',
      companyName: 'Northstar',
      occurredAt: '2026-08-24T12:00:00.000Z',
      transcriptStatus: 'available',
      summary: 'The call stayed focused on the current process.',
      evidence: [],
    };

    expect(getSalesCoachingAvailability(review)).toEqual({
      isAvailable: false,
      reason: 'missing-evidence',
    });
  });
});
