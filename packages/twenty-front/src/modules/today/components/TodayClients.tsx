import {
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
import {
  agoWords,
  formatCount,
} from '@/client-workspace/utils/clientWorkspaceModel';
import {
  formatWait,
  WEEK_DAYS,
  type ClientDay,
} from '@/today/utils/todayModel';

// ── Who is being under-served ───────────────────────────────────────────────────────────────────
//
// Quietest client first, which is the whole point of the section: the client at the top of a
// pipeline report is never the one at risk, and the one nobody has heard from in a fortnight never
// appears in a report at all. Sorting by silence puts them in the one place they will be seen.
//
// A client is quiet when nothing came back this week and there was reason to expect something:
// their engagement is live, or we hold contacts or open deals for them. A client with nothing on
// file and no live engagement is not quiet, it is simply not started.

type Props = {
  clients: ClientDay[];
};

export const TodayClients = ({ clients }: Props) => {
  const quiet = clients.filter((row) => row.quiet);

  return (
    <StyledSection id="clients">
      <StyledSectionHead>
        <StyledSectionTitle>Attention by client</StyledSectionTitle>
        <StyledSectionMeta>
          {clients.length === 0
            ? 'no clients yet'
            : `${clients.length} ${clients.length === 1 ? 'client' : 'clients'} · ${quiet.length} with nothing back this week`}
        </StyledSectionMeta>
      </StyledSectionHead>

      {clients.length === 0 ? (
        <StyledEmpty>
          No client has any records yet. A client appears here as soon as one
          contact, deal or task carries their name.
        </StyledEmpty>
      ) : (
        <>
          <StyledScroller>
            <StyledTable>
              <thead>
                <tr>
                  <th>Client</th>
                  <th data-numeric="true">Replies this week</th>
                  <th data-numeric="true">Open</th>
                  <th data-numeric="true">Longest wait</th>
                  <th data-numeric="true">Open deals</th>
                  <th data-numeric="true">Stopped</th>
                  <th data-numeric="true">Contacts</th>
                  <th>Last recorded</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((row) => (
                  <tr key={row.scope}>
                    <td data-strong="true">
                      {row.name}
                      {row.status && (
                        <>
                          {' '}
                          <StyledChip>{row.status.toLowerCase()}</StyledChip>
                        </>
                      )}
                      {row.quiet && (
                        <>
                          {' '}
                          <StyledChip data-tone="watch">quiet</StyledChip>
                        </>
                      )}
                    </td>
                    <td data-numeric="true">
                      {formatCount(row.repliesThisWeek)}
                    </td>
                    <td data-numeric="true">{formatCount(row.openReplies)}</td>
                    <td data-numeric="true">
                      {row.openReplies > 0
                        ? formatWait(row.longestWaitHours)
                        : '—'}
                    </td>
                    <td data-numeric="true">
                      {formatCount(row.openOpportunities)}
                    </td>
                    <td data-numeric="true">
                      {row.stalledOpportunities > 0 ? (
                        <StyledChip data-tone="watch">
                          {row.stalledOpportunities}
                        </StyledChip>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td data-numeric="true">{formatCount(row.contacts)}</td>
                    <td>
                      {row.lastActivityAt
                        ? agoWords(row.lastActivityAt)
                        : 'never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </StyledScroller>

          <StyledNote>
            Replies this week counts the last {WEEK_DAYS} days. Last recorded is
            the newest task or deal written for that client — never the
            &ldquo;last update&rdquo; stamp, which an import rewrites on every
            row it touches and which would show a client nobody has spoken to in
            a month as touched this morning.
          </StyledNote>
        </>
      )}
    </StyledSection>
  );
};
