import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type {
  Connector,
  ConnectorLog,
  ImpactResult,
  SchemaChangeEvent,
  SyncHistoryEntry,
} from '../lib/types';
import { formatDuration, formatRows, timeSince } from '../lib/format';
import { syncStatusClass, syncStatusLabel } from '../lib/statusBadge';
import { Topbar } from '../components/Topbar';
import { StatusWithDot } from '../components/StatusWithDot';
import { AutoRemediatePanel } from '../components/AutoRemediatePanel';
import { AiConnectorModal } from '../components/AiConnectorModal';
import { ConnectorUsagePanel } from '../components/ConnectorUsagePanel';
import { SyncDurationBars } from '../components/SyncDurationBars';
import { ConnectorEditForm } from '../components/ConnectorEditForm';
import { useToast } from '../contexts/ToastContext';

type StatusFilter = 'all' | 'active' | 'failed' | 'paused' | 'warning';
type DetailTab = 'overview' | 'schema' | 'logs';

function matchesFilter(status: string, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return status === 'active' || status === 'syncing';
  if (filter === 'failed') return status === 'failed';
  if (filter === 'paused') return status === 'paused';
  if (filter === 'warning') return status === 'warning';
  return true;
}

function lastSuccessfulSync(history: SyncHistoryEntry[]): string | null {
  const hit = history.find((r) => r.status === 'succeeded');
  return hit?.finishedAt ?? null;
}

function schemaEventLabel(event: SchemaChangeEvent): string {
  const at = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const action =
    event.eventType === 'create_table'
      ? 'New table'
      : event.eventType === 'drop_table'
        ? 'Dropped'
        : event.objectType === 'column'
          ? `New column ${event.columnName}`
          : 'Altered';
  return `At ${at}: ${action} on ${event.tableName}`;
}

export function PipelinesPage() {
  const { showToast } = useToast();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Connector | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [logs, setLogs] = useState<ConnectorLog[]>([]);
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [schemaChanges, setSchemaChanges] = useState<SchemaChangeEvent[]>([]);
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const loadConnectors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ connectors: Connector[] }>('/fivetran/list-connectors', {
        method: 'POST',
      });
      setConnectors(data.connectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connectors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  async function openDetails(connector: Connector) {
    setSelected(connector);
    setDetailTab('overview');
    setDetailLoading(true);
    setDetailError('');
    setLogs([]);
    setHistory([]);
    setSchemaChanges([]);
    setImpact(null);

    try {
      const [logData, historyData, schemaData, impactData] = await Promise.all([
        api<{ logs: ConnectorLog[] }>('/fivetran/get-connector-logs', {
          method: 'POST',
          body: JSON.stringify({ connectorId: connector.id, timeRangeHours: 24 }),
        }),
        api<{ runs: SyncHistoryEntry[] }>('/fivetran/get-connector-history', {
          method: 'POST',
          body: JSON.stringify({ connectorId: connector.id }),
        }),
        api<{ changes: SchemaChangeEvent[] }>('/fivetran/get-schema-changes', {
          method: 'POST',
          body: JSON.stringify({ connectorId: connector.id }),
        }),
        connector.primaryTable
          ? api<ImpactResult>('/bigquery/check-impact', {
              method: 'POST',
              body: JSON.stringify({ primaryTable: connector.primaryTable }),
            })
          : Promise.resolve(null),
      ]);
      setLogs(logData.logs);
      setHistory(historyData.runs);
      setSchemaChanges(schemaData.changes);
      if (impactData) setImpact(impactData);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load connector details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveConnectorEdits(updates: { name: string; schedule: string }) {
    if (!selected) return;
    setSaveLoading(true);
    try {
      const result = await api<{ success: boolean; connector: Connector }>('/fivetran/update-connector', {
        method: 'POST',
        body: JSON.stringify({ connectorId: selected.id, ...updates }),
      });
      showToast('Connector settings saved.');
      setSelected(result.connector);
      await loadConnectors();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaveLoading(false);
    }
  }

  async function runAction(endpoint: string, label: string, body: Record<string, string>) {
    setActionLoading(true);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
      showToast(`${label} — action completed (demo).`);
      const fresh = await api<{ connectors: Connector[] }>('/fivetran/list-connectors', {
        method: 'POST',
      });
      setConnectors(fresh.connectors);
      if (selected) {
        const updated = fresh.connectors.find((c) => c.id === selected.id);
        if (updated) {
          setSelected(updated);
          await openDetails(updated);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = connectors.filter((c) => matchesFilter(c.status, statusFilter));
  const finishedAt = selected?.lastSyncFinishedAt ?? selected?.lastSyncAt;
  const lastSuccess = lastSuccessfulSync(history);

  return (
    <>
      <Topbar title="Pipelines" subtitle="Manage and monitor data connector sync pipelines" />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="page-toolbar">
        <label className="toolbar-field">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="failed">Failed</option>
            <option value="warning">Warning</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <span className="toolbar-meta">{filtered.length} connector(s)</span>
        <button
          type="button"
          className="btn btn--primary btn--sm toolbar-action"
          onClick={() => setAiModalOpen(true)}
        >
          ✨ Add connector with AI
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading pipelines…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Last sync status</th>
                  <th>Last sync finished</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="table-sub">{c.id}</div>
                    </td>
                    <td>{c.source}</td>
                    <td>{c.destination}</td>
                    <td className="muted">{c.schedule ?? '—'}</td>
                    <td>
                      <StatusWithDot status={c.status} />
                    </td>
                    <td>
                      {c.lastSyncStatus ? (
                        <span className={syncStatusClass(c.lastSyncStatus)}>
                          {syncStatusLabel(c.lastSyncStatus)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="muted">
                      {new Date(c.lastSyncFinishedAt ?? c.lastSyncAt).toLocaleString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => openDetails(c)}
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="muted">
                      No connectors match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConnectorUsagePanel />

      <AiConnectorModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSaved={loadConnectors}
      />

      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <aside className="drawer drawer--wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer__header">
              <div>
                <h2>{selected.name}</h2>
                <p className="muted">{selected.id}</p>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <div className="drawer__meta drawer__meta--4">
              <div>
                <span className="meta-label">Status</span>
                <StatusWithDot status={selected.status} />
              </div>
              <div>
                <span className="meta-label">Last sync status</span>
                {selected.lastSyncStatus ? (
                  <span className={syncStatusClass(selected.lastSyncStatus)}>
                    {syncStatusLabel(selected.lastSyncStatus)}
                  </span>
                ) : (
                  '—'
                )}
              </div>
              <div>
                <span className="meta-label">Last finished</span>
                <span>{finishedAt ? new Date(finishedAt).toLocaleString() : '—'}</span>
              </div>
              <div>
                <span className="meta-label">Schedule</span>
                <span>{selected.schedule ?? '—'}</span>
              </div>
            </div>

            {selected.errorMessage && (
              <div className="alert alert--error alert--compact">{selected.errorMessage}</div>
            )}

            {detailError && <div className="alert alert--error alert--compact">{detailError}</div>}

            <div className="detail-tabs">
              {(['overview', 'schema', 'logs'] as DetailTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`detail-tabs__btn${detailTab === tab ? ' detail-tabs__btn--active' : ''}`}
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'schema' ? 'Schema & Impact' : 'Logs'}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <div className="detail-tab-panel">
                <ConnectorEditForm
                  connector={selected}
                  saving={saveLoading}
                  onSave={saveConnectorEdits}
                />

                <h3 className="drawer__section-title">Health</h3>
                {detailLoading ? (
                  <p className="muted">Loading health metrics…</p>
                ) : (
                  <>
                    <div className="health-grid">
                      <div className="health-grid__item">
                        <span className="meta-label">Last sync status</span>
                        <span className={syncStatusClass(selected.lastSyncStatus ?? '')}>
                          {syncStatusLabel(selected.lastSyncStatus ?? '—')}
                        </span>
                      </div>
                      <div className="health-grid__item">
                        <span className="meta-label">Since last success</span>
                        <span>{lastSuccess ? timeSince(lastSuccess) : 'No recent success'}</span>
                      </div>
                      <div className="health-grid__item">
                        <span className="meta-label">Avg sync duration</span>
                        <span>
                          {selected.avgSyncDurationSeconds
                            ? formatDuration(selected.avgSyncDurationSeconds)
                            : '—'}
                        </span>
                      </div>
                      <div className="health-grid__item">
                        <span className="meta-label">Rows last sync</span>
                        <span>
                          {selected.rowsProcessedLastSync != null
                            ? formatRows(selected.rowsProcessedLastSync)
                            : '—'}
                        </span>
                      </div>
                      <div className="health-grid__item">
                        <span className="meta-label">Inserted / Updated / Deleted</span>
                        <span className="muted">
                          {formatRows(selected.rowsInsertedLastSync ?? 0)} /{' '}
                          {formatRows(selected.rowsUpdatedLastSync ?? 0)} /{' '}
                          {formatRows(selected.rowsDeletedLastSync ?? 0)}
                        </span>
                      </div>
                    </div>

                    <h3 className="drawer__section-title">Sync duration trend</h3>
                    <SyncDurationBars runs={history} loading={detailLoading} />
                  </>
                )}

                <div className="drawer__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction('/fivetran/trigger-sync', 'Sync triggered', { connectorId: selected.id })
                    }
                  >
                    Trigger sync
                  </button>
                  {selected.status === 'paused' ? (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={actionLoading}
                      onClick={() =>
                        runAction('/fivetran/resume-connector', 'Connector resumed', {
                          connectorId: selected.id,
                        })
                      }
                    >
                      Resume connector
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={actionLoading}
                      onClick={() =>
                        runAction('/fivetran/pause-connector', 'Connector paused', {
                          connectorId: selected.id,
                        })
                      }
                    >
                      Pause connector
                    </button>
                  )}
                </div>

                {selected.status === 'failed' && (
                  <AutoRemediatePanel
                    connectorId={selected.id}
                    connectorName={selected.name}
                    onComplete={loadConnectors}
                  />
                )}
              </div>
            )}

            {detailTab === 'schema' && (
              <div className="detail-tab-panel">
                <h3 className="drawer__section-title">Schema changes</h3>
                {detailLoading ? (
                  <p className="muted">Loading schema timeline…</p>
                ) : schemaChanges.length === 0 ? (
                  <p className="muted">No schema changes recorded for this connector.</p>
                ) : (
                  <ul className="schema-timeline">
                    {schemaChanges.map((event, i) => (
                      <li key={i} className="schema-timeline__item">
                        <span className="schema-timeline__time">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                        <span className={`badge badge--${event.eventType === 'drop_table' ? 'danger' : 'info'}`}>
                          {event.eventType.replace('_', ' ')}
                        </span>
                        <p className="schema-timeline__title">{schemaEventLabel(event)}</p>
                        <p className="muted schema-timeline__details">{event.details}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="drawer__section-title">Downstream impact</h3>
                {detailLoading ? (
                  <p className="muted">Loading impact analysis…</p>
                ) : !impact ? (
                  <p className="muted">No primary table mapped for impact analysis.</p>
                ) : (
                  <div className="impact-block">
                    <p className="impact-block__table">
                      <span className="meta-label">Upstream table</span>
                      <code>{impact.upstream_table}</code>
                    </p>
                    <p>{impact.summary}</p>
                    {impact.downstream_views.length > 0 && (
                      <>
                        <span className="meta-label">Impacted views</span>
                        <ul className="impact-list">
                          {impact.downstream_views.map((view) => (
                            <li key={view}>
                              <code>{view}</code>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {impact.affectedDashboards && impact.affectedDashboards.length > 0 && (
                      <>
                        <span className="meta-label">Dashboards</span>
                        <p className="muted">{impact.affectedDashboards.join(' · ')}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'logs' && (
              <div className="detail-tab-panel">
                <h3 className="drawer__section-title">Recent logs</h3>
                {detailLoading ? (
                  <p className="muted">Loading logs…</p>
                ) : logs.length === 0 ? (
                  <p className="muted">No logs in the last 24 hours.</p>
                ) : (
                  <ul className="log-list">
                    {logs.map((log, i) => (
                      <li key={i} className={`log-list__item log-list__item--${log.level}`}>
                        <span className="log-list__time">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`badge badge--${log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'info'}`}
                        >
                          {log.level}
                        </span>
                        <span className="log-list__msg">{log.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

