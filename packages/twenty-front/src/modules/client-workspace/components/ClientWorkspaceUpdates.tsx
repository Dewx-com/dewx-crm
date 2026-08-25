import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  StyledChip,
  StyledEmpty,
  StyledListMeta,
  StyledListName,
  StyledListRow,
  StyledNote,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import { type DeliverableRow } from '@/client-workspace/hooks/useClientWorkspace';
import { dayStamp, type Update } from '@/client-workspace/utils/clientWorkspaceModel';

// ── Deliverables and updates ────────────────────────────────────────────────────────────────────
//
// What was handed over, and a dated log of everything that has been published or finished. The log
// is built only from published records and completed actions — never from internal notes — which is
// what makes it safe to put in front of a client without anyone reading it first.
//
// A deliverable shows a link only when the link is the safe one recorded against it. Working files
// are not linked from here and are not meant to be: they live in the client folder on the machine
// that owns them.

const StyledLink = styled.a`
  color: ${themeCssVariables.color.blue};
  font-size: ${themeCssVariables.font.size.xs};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const TYPE_WORDS: Record<string, string> = {
  PLAN: 'plan',
  REPORT: 'report',
  DATABASE: 'database',
  LIST: 'list',
  DOCUMENT: 'document',
  OTHER: 'file',
};

const UPDATE_LIMIT = 25;

type Props = { deliverables: DeliverableRow[]; updates: Update[] };

export const ClientWorkspaceUpdates = ({ deliverables, updates }: Props) => (
  <>
    <StyledSection id="deliverables">
      <StyledSectionHead>
        <StyledSectionTitle>Deliverables</StyledSectionTitle>
        <StyledSectionMeta>
          {deliverables.length} handed over
        </StyledSectionMeta>
      </StyledSectionHead>

      {deliverables.length === 0 ? (
        <StyledEmpty>Nothing has been handed over yet.</StyledEmpty>
      ) : (
        deliverables.map((row) => {
          const url = row.safeLink?.primaryLinkUrl ?? '';
          return (
            <StyledListRow key={row.id}>
              <StyledListName>
                {row.title ?? 'Deliverable'}
                {row.deliverableType && (
                  <>
                    {' '}
                    <StyledChip>{TYPE_WORDS[row.deliverableType] ?? row.deliverableType}</StyledChip>
                  </>
                )}
              </StyledListName>
              <StyledListMeta>
                {row.deliveredAt ? dayStamp(row.deliveredAt) : 'date not recorded'}
                {url && (
                  <>
                    <br />
                    <StyledLink href={url} target="_blank" rel="noreferrer">
                      {row.safeLink?.primaryLinkLabel || 'open'}
                    </StyledLink>
                  </>
                )}
              </StyledListMeta>
            </StyledListRow>
          );
        })
      )}
    </StyledSection>

    <StyledSection id="updates">
      <StyledSectionHead>
        <StyledSectionTitle>Updates</StyledSectionTitle>
        <StyledSectionMeta>newest first</StyledSectionMeta>
      </StyledSectionHead>

      {updates.length === 0 ? (
        <StyledEmpty>Nothing published or completed yet.</StyledEmpty>
      ) : (
        updates.slice(0, UPDATE_LIMIT).map((update) => (
          <StyledListRow key={update.key}>
            <StyledListName>
              <StyledChip>{update.kind}</StyledChip> {update.text}
            </StyledListName>
            <StyledListMeta>{dayStamp(update.at)}</StyledListMeta>
          </StyledListRow>
        ))
      )}

      <StyledNote>
        This log is generated from published plans and reports, delivered files and completed
        actions. Work that is still in draft does not appear, which is why the list is shorter than
        the week usually is.
      </StyledNote>
    </StyledSection>
  </>
);
