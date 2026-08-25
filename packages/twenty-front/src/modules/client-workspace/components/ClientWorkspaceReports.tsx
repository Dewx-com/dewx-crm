import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  StyledChip,
  StyledEmpty,
  StyledNote,
  StyledProse,
  StyledSection,
  StyledSectionHead,
  StyledSectionMeta,
  StyledSectionTitle,
  StyledSubTitle,
} from '@/client-workspace/components/ClientWorkspaceStyles';
import { type ReportRow } from '@/client-workspace/hooks/useClientWorkspace';
import {
  dayStamp,
  paragraphsOf,
  periodLabel,
} from '@/client-workspace/utils/clientWorkspaceModel';

// ── Reports ─────────────────────────────────────────────────────────────────────────────────────
//
// A report is the written account of a period: what happened, what it means, what changed since the
// last one, and what we recommend. The numbers for that period live in the funnel above, which is
// why nothing is restated here — a figure printed twice is a figure that will eventually disagree
// with itself.
//
// The archive is the whole point of versioning them. A client should be able to open the report
// from six weeks ago and read the same words we read at the time, rather than a page that has
// quietly been recalculated since.

const StyledArchiveRow = styled.button`
  align-items: baseline;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-left: 2px solid transparent;
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-wrap: wrap;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }

  &[data-selected='true'] {
    background: ${themeCssVariables.background.transparent.light};
    border-left-color: ${themeCssVariables.color.blue};
  }
`;

const StyledArchiveMeta = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

const Passage = ({ label, value }: { label: string; value: string | null | undefined }) => {
  const parts = paragraphsOf(value);
  if (parts.length === 0) return null;
  return (
    <>
      <StyledSubTitle>{label}</StyledSubTitle>
      {parts.map((part, index) => (
        <StyledProse key={`${label}-${index}`}>{part}</StyledProse>
      ))}
    </>
  );
};

type Props = {
  reports: ReportRow[];
  selected: ReportRow | undefined;
  onSelect: (reportId: string) => void;
};

export const ClientWorkspaceReports = ({ reports, selected, onSelect }: Props) => (
  <>
    <StyledSection id="report">
      <StyledSectionHead>
        <StyledSectionTitle>Report</StyledSectionTitle>
        <StyledSectionMeta>
          {selected
            ? `${periodLabel(selected)}${selected.measuredAt ? ` · measured ${dayStamp(selected.measuredAt)}` : ''}`
            : 'nothing published'}
        </StyledSectionMeta>
      </StyledSectionHead>

      {!selected ? (
        <StyledEmpty>
          No report has been published yet. Reports appear here once they are written, approved and
          published; drafts stay with us until then.
        </StyledEmpty>
      ) : (
        <>
          <StyledSubTitle>{selected.title ?? 'Report'}</StyledSubTitle>
          <Passage label="In short" value={selected.executiveSummary} />
          <Passage label="What the numbers mean" value={selected.analysis} />
          <Passage label="What changed since the last report" value={selected.changesSincePrior} />
          <Passage label="What we recommend" value={selected.recommendations} />
        </>
      )}
    </StyledSection>

    <StyledSection id="archive">
      <StyledSectionHead>
        <StyledSectionTitle>Report archive</StyledSectionTitle>
        <StyledSectionMeta>
          {reports.length} published {reports.length === 1 ? 'report' : 'reports'}
        </StyledSectionMeta>
      </StyledSectionHead>

      {reports.length === 0 ? (
        <StyledEmpty>Nothing in the archive yet.</StyledEmpty>
      ) : (
        reports.map((report) => (
          <StyledArchiveRow
            key={report.id}
            data-selected={report.id === selected?.id}
            onClick={() => onSelect(report.id)}
          >
            <span>{report.title ?? 'Report'}</span>
            <StyledArchiveMeta>
              {periodLabel(report)}
              {report.id === selected?.id ? ' · ' : ''}
              {report.id === selected?.id && <StyledChip data-tone="info">showing</StyledChip>}
            </StyledArchiveMeta>
          </StyledArchiveRow>
        ))
      )}

      <StyledNote>
        Every report keeps the figures that were true when it was published. The sections above
        follow whichever period is selected here.
      </StyledNote>
    </StyledSection>
  </>
);
