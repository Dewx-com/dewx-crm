import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  StyledBarFill,
  StyledBarTrack,
  StyledChip,
  StyledEmpty,
  StyledNote,
  StyledScroller,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
  StyledTable,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import { type SnapshotRow } from '@/client-workspace/hooks/useClientWorkspace';
import {
  agoWords,
  dayStamp,
  formatCount,
  formatPercent,
  num,
  ratio,
  type MarketRow,
} from '@/client-workspace/utils/clientWorkspaceModel';

// ── Markets and campaigns ───────────────────────────────────────────────────────────────────────
//
// Two views of the same measurement. The market grid is where the answer usually is: the same
// message into three countries almost never lands the same way, and an account-wide acceptance rate
// hides the market that is doing all the work and the one that is doing none.
//
// The campaign table shows the safety gates beside the numbers rather than in a settings screen,
// because a campaign with no exclusion list is not a slower campaign, it is a campaign that can
// approach the same person twice from one account. A client can read every row here and change
// none of it — the controls live where the sending lives.

/** A bar and its figure on one line, so the eye compares the bars and the doubter reads the number. */
const StyledRateCell = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 140px;
`;

const StyledRateValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-variant-numeric: tabular-nums;
  width: 52px;
`;

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'calm',
  PAUSED: 'watch',
  FAILED: 'risk',
  FINISHED: 'info',
};

type Props = { snapshots: SnapshotRow[]; markets: MarketRow[]; measuredAt: string | null };

export const ClientWorkspaceCampaigns = ({ snapshots, markets, measuredAt }: Props) => {
  const bestRate = Math.max(
    1,
    ...markets.map((market) => ratio(market.accepts, market.invitations) ?? 0),
  );
  const measured = measuredAt
    ? `measured ${dayStamp(measuredAt)}, ${agoWords(measuredAt)}`
    : 'no published measurement';

  return (
    <>
      <StyledSection id="markets">
        <StyledSectionHead>
          <StyledSectionTitle>Markets compared</StyledSectionTitle>
          <StyledSectionMeta>{measured}</StyledSectionMeta>
        </StyledSectionHead>

        {markets.length === 0 ? (
          <StyledEmpty>
            No published campaign measurement yet, so there is nothing to compare.
          </StyledEmpty>
        ) : (
          <StyledScroller>
            <StyledTable>
              <thead>
                <tr>
                  <th>Market</th>
                  <th data-numeric="true">Campaigns</th>
                  <th data-numeric="true">Invitations</th>
                  <th data-numeric="true">Accepted</th>
                  <th>Acceptance</th>
                  <th data-numeric="true">Messages</th>
                  <th data-numeric="true">Sequences</th>
                  <th data-numeric="true">Replies</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market) => {
                  const rate = ratio(market.accepts, market.invitations);
                  return (
                    <tr key={market.market}>
                      <td data-strong="true">{market.market}</td>
                      <td data-numeric="true">{formatCount(market.campaigns)}</td>
                      <td data-numeric="true">{formatCount(market.invitations)}</td>
                      <td data-numeric="true">{formatCount(market.accepts)}</td>
                      <td>
                        <StyledRateCell>
                          <StyledBarTrack>
                            <StyledBarFill
                              data-tone="engagement"
                              style={{ width: `${Math.round(((rate ?? 0) / bestRate) * 100)}%` }}
                            />
                          </StyledBarTrack>
                          <StyledRateValue>{formatPercent(rate)}</StyledRateValue>
                        </StyledRateCell>
                      </td>
                      <td data-numeric="true">{formatCount(market.messages)}</td>
                      <td data-numeric="true">{formatCount(market.flows)}</td>
                      <td data-numeric="true">{formatCount(market.replies)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </StyledTable>
          </StyledScroller>
        )}

        <StyledNote>
          Acceptance says how many people were willing to connect. It is the earliest honest signal
          that the audience and the message match, and it is not a result on its own — a market can
          accept well and reply to nothing.
        </StyledNote>
      </StyledSection>

      <StyledSection id="campaigns">
        <StyledSectionHead>
          <StyledSectionTitle>Campaigns</StyledSectionTitle>
          <StyledSectionMeta>
            {snapshots.length > 0 ? `${snapshots.length} campaigns · ${measured}` : measured}
          </StyledSectionMeta>
        </StyledSectionHead>

        {snapshots.length === 0 ? (
          <StyledEmpty>
            No campaign measurement has been published yet. Campaign figures appear here once a
            measurement is published.
          </StyledEmpty>
        ) : (
          <StyledScroller>
            <StyledTable>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Market</th>
                  <th>Segment</th>
                  <th>Sender</th>
                  <th>Status</th>
                  <th data-numeric="true">Invited</th>
                  <th data-numeric="true">Accepted</th>
                  <th data-numeric="true">Accept %</th>
                  <th data-numeric="true">Messages</th>
                  <th data-numeric="true">Replies</th>
                  <th data-numeric="true">Queued</th>
                  <th>Safety</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((row) => {
                  const status = (row.status ?? 'UNKNOWN').toUpperCase();
                  const rate = ratio(num(row.accepts), num(row.invitations));
                  return (
                    <tr key={row.id}>
                      <td data-strong="true">{row.campaignName ?? '—'}</td>
                      <td>{row.market ?? '—'}</td>
                      <td>
                        {row.segment ?? '—'}
                        {row.companySize ? ` · ${row.companySize}` : ''}
                      </td>
                      <td>{row.senderName ?? '—'}</td>
                      <td>
                        <StyledChip data-tone={STATUS_TONE[status]}>{status}</StyledChip>
                      </td>
                      <td data-numeric="true">{formatCount(num(row.invitations))}</td>
                      <td data-numeric="true">{formatCount(num(row.accepts))}</td>
                      <td data-numeric="true">{formatPercent(rate)}</td>
                      <td data-numeric="true">{formatCount(num(row.messages))}</td>
                      <td data-numeric="true">{formatCount(num(row.replies))}</td>
                      <td data-numeric="true">
                        {formatCount(num(row.pending) + num(row.inProgress))}
                      </td>
                      <td>
                        <StyledChip data-tone={row.dncProtected === true ? 'calm' : 'risk'}>
                          {row.dncProtected === true ? 'exclusions on' : 'no exclusions'}
                        </StyledChip>{' '}
                        <StyledChip
                          data-tone={row.crossCampaignProtected === true ? 'calm' : 'risk'}
                        >
                          {row.crossCampaignProtected === true
                            ? 'cross-campaign on'
                            : 'cross-campaign off'}
                        </StyledChip>
                      </td>
                      <td>
                        {row.lastActivityAt
                          ? `${dayStamp(row.lastActivityAt)} · ${agoWords(row.lastActivityAt)}`
                          : 'none recorded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </StyledTable>
          </StyledScroller>
        )}

        <StyledNote>
          Queued counts people a campaign still has in hand — invitations waiting to go out and
          sequences part-way through. A paused campaign keeps its queue; it does not lose it.
        </StyledNote>
      </StyledSection>
    </>
  );
};
