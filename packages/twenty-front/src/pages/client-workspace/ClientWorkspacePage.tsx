import { styled } from '@linaria/react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ClientWorkspaceActions } from '@/client-workspace/components/ClientWorkspaceActions';
import { ClientWorkspaceCampaigns } from '@/client-workspace/components/ClientWorkspaceCampaigns';
import { ClientWorkspaceFunnel } from '@/client-workspace/components/ClientWorkspaceFunnel';
import { ClientWorkspaceOverview } from '@/client-workspace/components/ClientWorkspaceOverview';
import { ClientWorkspacePlan } from '@/client-workspace/components/ClientWorkspacePlan';
import { ClientWorkspaceReports } from '@/client-workspace/components/ClientWorkspaceReports';
import {
  StyledBanner,
  StyledBody,
  StyledChip,
  StyledChipRow,
  StyledEmpty,
  StyledNote,
  StyledPage,
  StyledSection,
  StyledSectionTitle,
  StyledSelect,
  StyledTextButton,
  StyledTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import { ClientWorkspaceUpdates } from '@/client-workspace/components/ClientWorkspaceUpdates';
import { useClientWorkspace } from '@/client-workspace/hooks/useClientWorkspace';
import {
  HEALTH_WORDS,
  healthOf,
  isPublished,
  latestPerCampaign,
  liveFunnel,
  marketsOf,
  nextAction,
  nextReportDue,
  periodLabel,
  reportFunnel,
  signalsOf,
  totalsOf,
  updatesOf,
  type SignalLevel,
} from '@/client-workspace/utils/clientWorkspaceModel';

// ── The client workspace ────────────────────────────────────────────────────────────────────────
//
// One page per client: the state of the work, the numbers behind it, the plan we agreed, who owes
// what, and every report we have published. It is deliberately generic — no client is named in this
// file — because the client a reader sees is decided by their role's record scope, not by the code.
// A client signs in and their scope returns one workspace; staff see several and pick one from the
// selector, which changes what is displayed and never what is permitted.
//
// Two gates run here, and both are about what a client is allowed to read:
//
//   1. Publication. Plans, reports, deliverables and campaign measurements are DRAFT → APPROVED →
//      PUBLISHED, and only the last is rendered. Staff can switch the view to everything, which
//      says so loudly at the top, so nobody confuses their own view with the client's.
//   2. Scope. Nothing on this page filters by client for safety — a filter written in the UI is a
//      suggestion. The queries return what the role is allowed to see, and the selector below only
//      narrows what is already permitted.
//
// The one rule the copy has to keep: volume is not success. Invitations and messages are work done,
// accepts and replies are interest, and only qualified leads and meetings are results.

const StyledHeader = styled.div`
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]}
    ${themeCssVariables.spacing[3]};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const StyledHeaderTop = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledJumps = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const LIVE = 'live';

const JUMPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'funnel', label: 'Results' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'plan', label: 'Plan' },
  { id: 'actions', label: 'Actions' },
  { id: 'report', label: 'Reports' },
  { id: 'updates', label: 'Updates' },
];

const HEALTH_TONE: Record<SignalLevel, string> = { RISK: 'risk', WATCH: 'watch', CALM: 'calm' };

const jumpTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export const ClientWorkspacePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [periodKey, setPeriodKey] = useState(LIVE);
  const [showEverything, setShowEverything] = useState(false);

  const { directory, plans, reports, snapshots, deliverables, tasks, loading } =
    useClientWorkspace();

  const entry = useMemo(
    () => directory.find((row) => row.slug === slug) ?? directory[0],
    [directory, slug],
  );

  // The URL always names the workspace being read, so a link to it can be sent to somebody.
  useEffect(() => {
    if (entry && entry.slug !== slug) navigate(`/client/${entry.slug}`, { replace: true });
  }, [entry, slug, navigate]);

  // A reader who can see more than one client is staff. It is the only signal this page needs, and
  // it comes from the same scope that decides what the queries return, so it cannot disagree with
  // the data. A client's role returns exactly one, and the staff-only controls never render.
  const isStaff = directory.length > 1;
  const everything = isStaff && showEverything;

  // Narrowing to one client is display, not protection: the queries already returned only what the
  // reader is allowed to see. Written per object rather than through one generic helper so each
  // list keeps its own row type all the way down to the section that renders it.
  const scope = entry?.scope ?? '';
  const myPlans = plans.filter((row) => row.client === scope);
  const myReports = reports.filter((row) => row.client === scope);
  const mySnapshots = snapshots.filter((row) => row.client === scope);
  const myDeliverables = deliverables.filter((row) => row.client === scope);
  const myTasks = tasks.filter((row) => row.client === scope);

  const publishedPlans = myPlans.filter((plan) => isPublished(plan.status));
  const publishedReports = myReports.filter((report) => isPublished(report.status));
  const publishedSnapshots = mySnapshots.filter((row) => isPublished(row.publicationStatus));
  const publishedDeliverables = myDeliverables.filter(
    (row) => isPublished(row.status) && row.clientVisible === true,
  );

  const shownPlans = everything ? myPlans : publishedPlans;
  const shownReports = everything ? myReports : publishedReports;
  const shownSnapshots = everything ? mySnapshots : publishedSnapshots;
  const shownDeliverables = everything ? myDeliverables : publishedDeliverables;

  const hidden =
    myPlans.length -
    publishedPlans.length +
    (myReports.length - publishedReports.length) +
    (mySnapshots.length - publishedSnapshots.length) +
    (myDeliverables.length - publishedDeliverables.length);

  const campaigns = useMemo(() => latestPerCampaign(shownSnapshots), [shownSnapshots]);
  const totals = useMemo(() => totalsOf(campaigns), [campaigns]);
  const markets = useMemo(() => marketsOf(campaigns), [campaigns]);

  const latestReport = shownReports[0];
  const selectedReport =
    shownReports.find((report) => report.id === periodKey) ?? latestReport;

  const signals = useMemo(
    () =>
      signalsOf({
        snapshots: shownSnapshots,
        totals,
        publishedReports: shownReports,
        publishedPlan: shownPlans[0],
        tasks: myTasks,
      }),
    [shownSnapshots, totals, shownReports, shownPlans, myTasks],
  );
  const health = healthOf(signals);

  const funnel =
    periodKey === LIVE || !selectedReport
      ? liveFunnel(totals, latestReport)
      : reportFunnel(selectedReport);
  const funnelSource =
    periodKey === LIVE || !selectedReport
      ? 'live — the newest measurement of each campaign'
      : `report · ${periodLabel(selectedReport)}`;

  const updates = useMemo(
    () =>
      updatesOf({
        plans: myPlans,
        reports: myReports,
        deliverables: myDeliverables,
        tasks: myTasks,
      }),
    [myPlans, myReports, myDeliverables, myTasks],
  );

  if (!entry) {
    return (
      <StyledPage>
        <StyledBody>
          <StyledEmpty>
            {loading
              ? 'Loading the workspace…'
              : 'No client workspace is available to you yet. If you expect to see one here, your access has not been set up.'}
          </StyledEmpty>
        </StyledBody>
      </StyledPage>
    );
  }

  return (
    <StyledPage>
      <StyledHeader>
        <StyledHeaderTop>
          <StyledTitle>{entry.name}</StyledTitle>
          <StyledControls>
            {isStaff && (
              <StyledSelect
                value={entry.slug}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  navigate(`/client/${event.target.value}`)
                }
                aria-label="Client"
              >
                {directory.map((row) => (
                  <option key={row.scope} value={row.slug}>
                    {row.name}
                  </option>
                ))}
              </StyledSelect>
            )}
            <StyledSelect
              value={periodKey}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setPeriodKey(event.target.value)}
              aria-label="Period"
            >
              <option value={LIVE}>Live — latest measurement</option>
              {shownReports.map((report) => (
                <option key={report.id} value={report.id}>
                  {periodLabel(report)}
                </option>
              ))}
            </StyledSelect>
            {isStaff && (
              <StyledSelect
                value={showEverything ? 'all' : 'client'}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setShowEverything(event.target.value === 'all')
                }
                aria-label="What to show"
              >
                <option value="client">What the client sees</option>
                <option value="all">Everything, including drafts</option>
              </StyledSelect>
            )}
          </StyledControls>
        </StyledHeaderTop>

        <StyledChipRow>
          <StyledChip data-tone={HEALTH_TONE[health]}>{HEALTH_WORDS[health]}</StyledChip>
          {entry.status && <StyledChip>{entry.status.toLowerCase()}</StyledChip>}
          {totals.paused > 0 && totals.paused === totals.campaigns && (
            <StyledChip data-tone="risk">all campaigns paused</StyledChip>
          )}
          {entry.heyreachWorkspace && <StyledChip>seat: {entry.heyreachWorkspace}</StyledChip>}
          <StyledJumps>
            {JUMPS.map((jump) => (
              <StyledTextButton key={jump.id} onClick={() => jumpTo(jump.id)}>
                {jump.label}
              </StyledTextButton>
            ))}
          </StyledJumps>
        </StyledChipRow>
      </StyledHeader>

      <StyledBody>
        {everything && (
          <StyledBanner data-tone="watch">
            <span>
              You are seeing everything, including drafts. A client sees only published plans,
              reports, measurements and deliverables.
            </span>
          </StyledBanner>
        )}
        {!everything && isStaff && hidden > 0 && (
          <StyledNote>
            {hidden} {hidden === 1 ? 'record is' : 'records are'} not published, so they are hidden
            here — exactly as the client sees it.
          </StyledNote>
        )}

        <ClientWorkspaceOverview
          entry={entry}
          totals={totals}
          signals={signals}
          health={health}
          latestReport={latestReport}
          nextAction={nextAction(myTasks)}
          nextReportAt={nextReportDue(shownReports, myTasks)}
          hasSnapshots={campaigns.length > 0}
        />

        <ClientWorkspaceFunnel steps={funnel} sourceLabel={funnelSource} />

        <ClientWorkspaceCampaigns
          snapshots={campaigns}
          markets={markets}
          measuredAt={totals.measuredAt}
        />

        <ClientWorkspacePlan plan={shownPlans[0]} tasks={myTasks} />

        <ClientWorkspaceActions tasks={myTasks} signals={signals} />

        <ClientWorkspaceReports
          reports={shownReports}
          selected={selectedReport}
          onSelect={setPeriodKey}
        />

        <ClientWorkspaceUpdates deliverables={shownDeliverables} updates={updates} />

        <StyledSection id="how-to-read">
          <StyledSectionTitle>How to read this page</StyledSectionTitle>
          <StyledNote>
            Every figure here is counted from the records in this workspace at the moment the page
            loads, and each one says when it was measured. Nothing is copied into a summary that can
            drift away from the rows behind it. Where a number could only come from a written report
            — qualified leads and meetings — the report and its period are named beside it.
          </StyledNote>
          <StyledNote>
            Invitations, sequences and messages measure effort. Accepted connections and replies
            measure interest. Qualified leads and meetings are the results. A page full of the first
            two and empty of the last two means the machine is running and the outcome has not
            arrived yet, and it is worth saying so rather than adding the columns together.
          </StyledNote>
        </StyledSection>
      </StyledBody>
    </StyledPage>
  );
};
