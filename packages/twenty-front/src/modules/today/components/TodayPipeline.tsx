import {
  StyledChip,
  StyledEmpty,
  StyledHint,
  StyledNote,
  StyledScroller,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
  StyledTable,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import {
  STAGE_WORDS,
  type StageSummary,
  type StalledOpportunity,
} from '@/today/utils/todayModel';

// ── Deals that have stopped moving ──────────────────────────────────────────────────────────────
//
// The summary is the finding; the list is the work. Measured 2026-08-22: 299 of 500 opportunities
// were past their stage limit and 263 of those were still at NEW. Printed as three hundred rows
// that is the same wall of noise this page was built to replace, and it would be read once. Printed
// as "NEW: 263 past 7 days, none owned" it is one sentence about a column nobody has triaged.
//
// So the stages are counted first, the worst offenders are listed underneath, and the rest are
// counted rather than drawn. The list is bounded on purpose and says what it is leaving out.

const SHOWN = 12;

type Props = {
  stalled: StalledOpportunity[];
  summary: StageSummary[];
  showClient: boolean;
};

export const TodayPipeline = ({ stalled, summary, showClient }: Props) => {
  const worst = stalled.slice(0, SHOWN);
  const rest = stalled.length - worst.length;
  const unowned = stalled.filter((row) => !row.owner).length;
  const undated = stalled.filter((row) => !row.hasCloseDate).length;

  return (
    <StyledSection id="pipeline">
      <StyledSectionHead>
        <StyledSectionTitle>Stopped moving</StyledSectionTitle>
        <StyledSectionMeta>
          {stalled.length === 0
            ? 'every deal is inside its stage limit'
            : `${stalled.length} past their stage limit · ${unowned} with no owner`}
        </StyledSectionMeta>
      </StyledSectionHead>

      {stalled.length === 0 ? (
        <StyledEmpty>
          Nothing has been sitting in a stage longer than that stage allows. New
          deals appear here once they pass their limit: 7 days at new, 5 at
          screening, 3 at meeting, 7 at proposal.
        </StyledEmpty>
      ) : (
        <>
          <StyledScroller>
            <StyledTable>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th data-numeric="true">Past its limit</th>
                  <th data-numeric="true">Limit</th>
                  <th data-numeric="true">Oldest</th>
                  <th data-numeric="true">No owner</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.stage}>
                    <td data-strong="true">
                      {STAGE_WORDS[row.stage] ?? row.stage.toLowerCase()}
                    </td>
                    <td data-numeric="true">{row.stalled}</td>
                    <td data-numeric="true">{row.limitDays}d</td>
                    <td data-numeric="true">{row.oldestDays}d</td>
                    <td data-numeric="true">
                      {row.unowned > 0 ? (
                        <StyledChip data-tone="risk">{row.unowned}</StyledChip>
                      ) : (
                        '0'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </StyledScroller>

          <StyledScroller>
            <StyledTable>
              <thead>
                <tr>
                  <th>Deal</th>
                  {showClient && <th>Client</th>}
                  <th>Stage</th>
                  <th>Owner</th>
                  <th data-numeric="true">Days over</th>
                </tr>
              </thead>
              <tbody>
                {worst.map((row) => (
                  <tr key={row.id}>
                    <td data-strong="true">
                      {row.name}
                      {!row.hasCloseDate && (
                        <>
                          {' '}
                          <StyledHint>no close date</StyledHint>
                        </>
                      )}
                    </td>
                    {showClient && <td>{row.client ?? '—'}</td>}
                    <td>{STAGE_WORDS[row.stage] ?? row.stage.toLowerCase()}</td>
                    <td>
                      {row.owner ?? (
                        <StyledChip data-tone="risk">
                          nobody&rsquo;s job
                        </StyledChip>
                      )}
                    </td>
                    <td data-numeric="true">
                      <StyledChip data-tone="watch">
                        +{row.daysOver}d
                      </StyledChip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </StyledScroller>

          {rest > 0 && (
            <StyledNote>
              The {SHOWN} furthest past their limit are listed. {rest} more are
              also over, and the stage table above counts every one of them.
            </StyledNote>
          )}

          <StyledNote>
            Days are counted from the last time a person touched the deal by
            hand, and from when it arrived for every deal nobody has. This CRM
            does not record when a stage changed, and an import rewrites the
            &ldquo;last update&rdquo; on every row it runs over, so a figure
            taken from that would read as nought for all of them. What the
            number means is: this deal has been with us this long and is still
            at this stage.
            {undated > 0 && (
              <>
                {' '}
                {undated} of them carry no close date, so nothing can forecast
                them either.
              </>
            )}
          </StyledNote>
        </>
      )}
    </StyledSection>
  );
};
