import {
  type OperationsWorkspaceCallbacks,
  type OperationsWorkspaceData,
} from '@/team-workspace/operations/operations-workspace-types';
import {
  buildClientRows,
  clientsNeedingVerifiedUpdate,
  dueLabel,
  formatDateTime,
  isTaskOverdue,
} from '@/team-workspace/operations/utils/operationsWorkspaceModel';
import { OperationsSectionShell } from './operations-section-shell';
import {
  StyledActions,
  StyledButton,
  StyledCellHint,
  StyledCellStack,
  StyledPill,
  StyledScroller,
  StyledTable,
  StyledTextButton,
} from './operations-workspace-elements';
import {
  StyledEmpty,
  StyledMetric,
  StyledMetricLabel,
  StyledMetrics,
  StyledMetricValue,
  StyledSection,
  StyledSectionHead,
  StyledSectionHint,
  StyledSectionTitle,
} from './operations-workspace-layout';

type OperationsClientsSectionProps = {
  data: OperationsWorkspaceData;
  now?: Date;
  callbacks: OperationsWorkspaceCallbacks;
};

const HEALTH_LABEL = {
  healthy: 'Healthy',
  watch: 'Watch',
  'at-risk': 'At risk',
  unknown: 'Not assessed',
} as const;

const STATUS_LABEL = {
  onboarding: 'Onboarding',
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
  unknown: 'Not classified',
} as const;

const healthTone = (health: keyof typeof HEALTH_LABEL): string | undefined => {
  if (health === 'at-risk') return 'risk';
  if (health === 'watch') return 'watch';
  if (health === 'healthy') return 'healthy';
  return undefined;
};

export const OperationsClientsSection = ({
  data,
  now = new Date(),
  callbacks: { onAddUpdate, onOpenRecord },
}: OperationsClientsSectionProps) => {
  const rows = buildClientRows(data);
  const updateQueue = clientsNeedingVerifiedUpdate(data, now);
  const atRiskCount = data.clients.filter(
    (client) => client.health === 'at-risk',
  ).length;
  const overdueActionCount = rows.filter(
    (row) => row.nextAction && isTaskOverdue(row.nextAction, now),
  ).length;

  return (
    <OperationsSectionShell
      eyebrow={`${data.viewer.name} · Operations`}
      title="Clients"
      lead="See health, ownership, the next commitment, and the last update that someone actually verified."
    >
      <StyledMetrics aria-label="Client operations summary">
        <StyledMetric>
          <StyledMetricValue>{data.clients.length}</StyledMetricValue>
          <StyledMetricLabel>clients in the workspace</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric data-tone={atRiskCount > 0 ? 'risk' : undefined}>
          <StyledMetricValue>{atRiskCount}</StyledMetricValue>
          <StyledMetricLabel>clients at risk</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric data-tone={overdueActionCount > 0 ? 'risk' : undefined}>
          <StyledMetricValue>{overdueActionCount}</StyledMetricValue>
          <StyledMetricLabel>next actions overdue</StyledMetricLabel>
        </StyledMetric>
        <StyledMetric data-tone={updateQueue.length > 0 ? 'watch' : undefined}>
          <StyledMetricValue>{updateQueue.length}</StyledMetricValue>
          <StyledMetricLabel>verified updates due</StyledMetricLabel>
        </StyledMetric>
      </StyledMetrics>

      <StyledSection>
        <StyledSectionHead>
          <StyledSectionTitle>Client delivery register</StyledSectionTitle>
          <StyledSectionHint>
            Risk first, then action urgency within each health group
          </StyledSectionHint>
        </StyledSectionHead>

        {rows.length > 0 ? (
          <StyledScroller>
            <StyledTable>
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Health</th>
                  <th scope="col">Status</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Next action</th>
                  <th scope="col">Last verified update</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <StyledTextButton
                        type="button"
                        disabled={!onOpenRecord}
                        onClick={() =>
                          onOpenRecord?.({ kind: 'client', id: row.id })
                        }
                      >
                        {row.name}
                      </StyledTextButton>
                    </td>
                    <td>
                      <StyledPill data-tone={healthTone(row.health)}>
                        {HEALTH_LABEL[row.health]}
                      </StyledPill>
                    </td>
                    <td>{STATUS_LABEL[row.status]}</td>
                    <td>{row.ownerName ?? 'No owner'}</td>
                    <td>
                      {row.nextAction !== null ? (
                        <StyledCellStack>
                          <StyledTextButton
                            type="button"
                            disabled={!onOpenRecord}
                            onClick={() => {
                              if (row.nextAction === null) return;
                              onOpenRecord?.({
                                kind: 'task',
                                id: row.nextAction.id,
                              });
                            }}
                          >
                            {row.nextAction.title}
                          </StyledTextButton>
                          <StyledCellHint>
                            {dueLabel(row.nextAction.dueAt, now)}
                          </StyledCellHint>
                        </StyledCellStack>
                      ) : (
                        <StyledCellHint>No open action</StyledCellHint>
                      )}
                    </td>
                    <td>
                      {row.lastVerifiedUpdate !== null ? (
                        <StyledCellStack>
                          <StyledTextButton
                            type="button"
                            disabled={!onOpenRecord}
                            onClick={() => {
                              if (row.lastVerifiedUpdate === null) return;
                              onOpenRecord?.({
                                kind: 'update',
                                id: row.lastVerifiedUpdate.id,
                              });
                            }}
                          >
                            {row.lastVerifiedUpdate.summary}
                          </StyledTextButton>
                          <StyledCellHint>
                            {formatDateTime(
                              row.lastVerifiedUpdate.verifiedAt ??
                                row.lastVerifiedUpdate.occurredAt,
                            )}{' '}
                            · {row.lastVerifiedUpdate.verifiedBy}
                          </StyledCellHint>
                        </StyledCellStack>
                      ) : (
                        <StyledPill data-tone="risk">
                          No verified update
                        </StyledPill>
                      )}
                    </td>
                    <td>
                      <StyledActions>
                        <StyledButton
                          type="button"
                          disabled={!onAddUpdate}
                          onClick={() => onAddUpdate?.(row.id)}
                        >
                          Add update
                        </StyledButton>
                        <StyledButton
                          type="button"
                          disabled={!onOpenRecord}
                          onClick={() =>
                            onOpenRecord?.({ kind: 'client', id: row.id })
                          }
                        >
                          Open
                        </StyledButton>
                      </StyledActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </StyledScroller>
        ) : (
          <StyledEmpty>
            No clients are connected yet. Add the shared client records before
            planning delivery work.
          </StyledEmpty>
        )}
      </StyledSection>
    </OperationsSectionShell>
  );
};
