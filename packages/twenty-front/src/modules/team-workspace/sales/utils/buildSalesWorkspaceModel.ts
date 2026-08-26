import {
  type SalesCoachingReview,
  type SalesMeeting,
  type SalesOpportunity,
  type SalesWorkspaceData,
} from '@/team-workspace/sales/types/sales-workspace.types';

const UPCOMING_MEETING_STATUSES = new Set(['scheduled', 'prepared']);

const timestampOrNull = (value: string): number | null => {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
};

const requiredTimestamp = (value: string, fieldName: string): number => {
  const timestamp = timestampOrNull(value);

  if (timestamp === null) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }

  return timestamp;
};

const sortByTimestamp = <TItem>(
  items: TItem[],
  getDate: (item: TItem) => string,
  direction: 'ascending' | 'descending',
): TItem[] => {
  return [...items].sort((firstItem, secondItem) => {
    const firstTimestamp = timestampOrNull(getDate(firstItem));
    const secondTimestamp = timestampOrNull(getDate(secondItem));

    if (firstTimestamp === null) return 1;
    if (secondTimestamp === null) return -1;

    return direction === 'ascending'
      ? firstTimestamp - secondTimestamp
      : secondTimestamp - firstTimestamp;
  });
};

export type SalesCoachingAvailability =
  | {
      isAvailable: true;
      review: SalesCoachingReview & {
        summary: string;
        evidence: NonNullable<SalesCoachingReview['evidence']>;
      };
    }
  | {
      isAvailable: false;
      reason: 'missing-transcript' | 'processing' | 'missing-evidence';
    };

export const getSalesCoachingAvailability = (
  review: SalesCoachingReview,
): SalesCoachingAvailability => {
  if (review.transcriptStatus === 'missing') {
    return { isAvailable: false, reason: 'missing-transcript' };
  }

  if (review.transcriptStatus === 'processing') {
    return { isAvailable: false, reason: 'processing' };
  }

  const summary = review.summary?.trim();
  const evidence = review.evidence?.filter(
    (item) => item.observation.trim().length > 0,
  );

  if (summary === undefined || summary.length === 0 || !evidence?.length) {
    return { isAvailable: false, reason: 'missing-evidence' };
  }

  return {
    isAvailable: true,
    review: {
      ...review,
      summary,
      evidence,
    },
  };
};

export type SalesPipelineRow = {
  opportunity: SalesOpportunity;
  lastMeeting?: SalesMeeting;
  latestPastMeeting?: SalesMeeting;
  nextMeeting?: SalesMeeting;
};

export const buildSalesPipelineRows = (
  opportunities: SalesOpportunity[],
  meetings: SalesMeeting[],
  now: string,
): SalesPipelineRow[] => {
  const nowTimestamp = requiredTimestamp(now, 'now');

  return opportunities.map((opportunity) => {
    const linkedMeetings = meetings.filter(
      (meeting) => meeting.opportunityId === opportunity.id,
    );
    const attendedMeetings = linkedMeetings.filter((meeting) => {
      const startsAt = timestampOrNull(meeting.startsAt);

      return (
        meeting.status === 'attended' &&
        startsAt !== null &&
        startsAt <= nowTimestamp
      );
    });
    const recordedPastMeetings = linkedMeetings.filter((meeting) => {
      const startsAt = timestampOrNull(meeting.startsAt);

      return (
        (meeting.status === 'attended' ||
          meeting.status === 'outcome-missing' ||
          meeting.status === 'no-show') &&
        startsAt !== null &&
        startsAt <= nowTimestamp
      );
    });
    const upcomingMeetings = linkedMeetings.filter((meeting) => {
      const startsAt = timestampOrNull(meeting.startsAt);

      return (
        UPCOMING_MEETING_STATUSES.has(meeting.status) &&
        startsAt !== null &&
        startsAt >= nowTimestamp
      );
    });

    return {
      opportunity,
      lastMeeting: sortByTimestamp(
        attendedMeetings,
        (meeting) => meeting.startsAt,
        'descending',
      )[0],
      latestPastMeeting: sortByTimestamp(
        recordedPastMeetings,
        (meeting) => meeting.startsAt,
        'descending',
      )[0],
      nextMeeting: sortByTimestamp(
        upcomingMeetings,
        (meeting) => meeting.startsAt,
        'ascending',
      )[0],
    };
  });
};

export const buildSalesWorkspaceModel = (
  data: SalesWorkspaceData,
  now: string,
) => {
  const nowTimestamp = requiredTimestamp(now, 'now');
  const upcomingMeetings = sortByTimestamp(
    data.meetings.filter((meeting) => {
      const startsAt = timestampOrNull(meeting.startsAt);

      return (
        UPCOMING_MEETING_STATUSES.has(meeting.status) &&
        startsAt !== null &&
        startsAt >= nowTimestamp
      );
    }),
    (meeting) => meeting.startsAt,
    'ascending',
  );
  const overdueFollowUps = sortByTimestamp(
    data.followUps.filter((followUp) => {
      const dueAt = timestampOrNull(followUp.dueAt);

      return (
        followUp.status === 'open' && dueAt !== null && dueAt < nowTimestamp
      );
    }),
    (followUp) => followUp.dueAt,
    'ascending',
  );
  const coachingReviews = sortByTimestamp(
    data.coachingReviews,
    (review) => review.occurredAt,
    'descending',
  );
  const meetings = [...data.meetings].sort((firstMeeting, secondMeeting) => {
    const firstTimestamp = timestampOrNull(firstMeeting.startsAt);
    const secondTimestamp = timestampOrNull(secondMeeting.startsAt);

    if (firstTimestamp === null) return 1;
    if (secondTimestamp === null) return -1;

    const firstIsUpcoming = firstTimestamp >= nowTimestamp;
    const secondIsUpcoming = secondTimestamp >= nowTimestamp;

    if (firstIsUpcoming !== secondIsUpcoming) {
      return firstIsUpcoming ? -1 : 1;
    }

    return firstIsUpcoming
      ? firstTimestamp - secondTimestamp
      : secondTimestamp - firstTimestamp;
  });

  return {
    nextMeeting: upcomingMeetings[0],
    upcomingMeetings,
    overdueFollowUps,
    coachingReviews,
    latestCoachingReview: coachingReviews[0],
    meetings,
    pipelineRows: buildSalesPipelineRows(
      data.opportunities,
      data.meetings,
      now,
    ),
  };
};

export type SalesWorkspaceModel = ReturnType<typeof buildSalesWorkspaceModel>;

export const formatSalesDateTime = (value: string): string => {
  const timestamp = timestampOrNull(value);

  if (timestamp === null) return 'Date unavailable';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
};

export const formatSalesRelativeTime = (value: string, now: string): string => {
  const timestamp = timestampOrNull(value);
  const nowTimestamp = requiredTimestamp(now, 'now');

  if (timestamp === null) return 'Time unavailable';

  const minutes = Math.max(
    0,
    Math.round((timestamp - nowTimestamp) / (60 * 1000)),
  );

  if (minutes === 0) return 'Starts now';
  if (minutes < 60) return `Starts in ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes === 0
      ? `Starts in ${hours}h`
      : `Starts in ${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);

  return `Starts in ${days}d`;
};
