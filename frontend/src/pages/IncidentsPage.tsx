import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Connector, Incident, Playbook } from '../lib/types';
import { Topbar } from '../components/Topbar';
import {
  connectorStatusClass,
  incidentStatusClass,
  severityClass,
  severityLabel,
} from '../lib/statusBadge';
import { useToast } from '../contexts/ToastContext';

type StatusFilter = 'all' | 'open' | 'investigating' | 'resolved';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

export function IncidentsPage() {
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [selected, setSelected] = useState<Incident | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [agentReply, setAgentReply] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [incData, connData] = await Promise.all([
        api<{ incidents: Incident[] }>('/mongo/list-incidents'),
        api<{ connectors: Connector[] }>('/fivetran/list-connectors', { method: 'POST' }),
      ]);
      setIncidents(incData.incidents);
      setConnectors(connData.connectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const filtered = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    return true;
  });

  const relatedConnector = selected?.connectorId
    ? connectors.find((c) => c.id === selected.connectorId)
    : undefined;

  async function updateStatus(id: string, status: string) {
    setActionLoading(true);
    try {
      await api(`/mongo/update-incident/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      showToast(`Incident marked as ${status} (demo).`);
      const data = await api<{ incidents: Incident[] }>('/mongo/list-incidents');
      setIncidents(data.incidents);
      const updated = data.incidents.find((i) => i.id === id);
      if (updated) setSelected(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function loadPlaybook(incidentType: string) {
    try {
      const data = await api<{ playbook: Playbook }>('/mongo/get-playbook', {
        method: 'POST',
        body: JSON.stringify({ incidentType }),
      });
      setPlaybook(data.playbook);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load playbook', 'error');
    }
  }

  async function askAgentRemediation(inc: Incident) {
    setAgentLoading(true);
    setAgentReply('');
    try {
      const message = `Given incident ${inc.id} ("${inc.title}") affecting connector ${inc.connectorId ?? 'unknown'}, severity ${inc.severity}, status ${inc.status}. Root cause: ${inc.rootCause ?? inc.summary}. What remediation plan do you suggest?`;
      const data = await api<{ reply: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      setAgentReply(data.reply);
    } catch (err) {
      setAgentReply(`Error: ${err instanceof Error ? err.message : 'Agent unavailable'}`);
    } finally {
      setAgentLoading(false);
    }
  }

  function selectIncident(inc: Incident) {
    setSelected(inc);
    setPlaybook(null);
    setAgentReply('');
  }

  return (
    <>
      <Topbar title="Incidents" subtitle="Track, triage, and resolve data reliability incidents" />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="incidents-layout">
        <div className="incidents-layout__list">
          <div className="page-toolbar">
            <label className="toolbar-field">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <label className="toolbar-field">
              <span>Severity</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              >
                <option value="all">All</option>
                <option value="critical">SEV-1</option>
                <option value="high">SEV-2</option>
                <option value="medium">SEV-3</option>
                <option value="low">SEV-4</option>
              </select>
            </label>
            <span className="toolbar-meta">{filtered.length} incident(s)</span>
          </div>

          <div className="card">
            {loading ? (
              <p className="muted">Loading incidents…</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table data-table--clickable">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Connector</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inc) => (
                      <tr
                        key={inc.id}
                        className={selected?.id === inc.id ? 'row--selected' : ''}
                        onClick={() => selectIncident(inc)}
                      >
                        <td>
                          <strong>{inc.title}</strong>
                          <div className="table-sub">{inc.id}</div>
                        </td>
                        <td className="muted">{inc.connectorId ?? '—'}</td>
                        <td>
                          <span className={severityClass(inc.severity)}>
                            {severityLabel(inc.severity)}
                          </span>
                        </td>
                        <td>
                          <span className={incidentStatusClass(inc.status)}>{inc.status}</span>
                        </td>
                        <td className="muted">{new Date(inc.createdAt).toLocaleString()}</td>
                        <td className="muted">{new Date(inc.updatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="muted">
                          No incidents match filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="incidents-layout__detail">
          {selected ? (
            <div className="card">
              <h2 className="card__title">{selected.title}</h2>
              <div className="detail-badges">
                <span className={severityClass(selected.severity)}>
                  {severityLabel(selected.severity)}
                </span>
                <span className={incidentStatusClass(selected.status)}>{selected.status}</span>
              </div>

              {relatedConnector && (
                <div className="detail-section connector-ref">
                  <h3>Related connector</h3>
                  <p>
                    <strong>{relatedConnector.name}</strong>{' '}
                    <span className={connectorStatusClass(relatedConnector.status)}>
                      {relatedConnector.status}
                    </span>
                  </p>
                  <p className="muted">{relatedConnector.id} · {relatedConnector.schedule}</p>
                  {relatedConnector.errorMessage && (
                    <p className="error-hint">{relatedConnector.errorMessage}</p>
                  )}
                </div>
              )}

              <div className="detail-section">
                <h3>Summary</h3>
                <p>{selected.summary}</p>
              </div>

              {selected.rootCause && (
                <div className="detail-section">
                  <h3>Root cause</h3>
                  <p>{selected.rootCause}</p>
                </div>
              )}

              {selected.recommendedActions && selected.recommendedActions.length > 0 && (
                <div className="detail-section">
                  <h3>Recommended actions</h3>
                  <ol className="action-list">
                    {selected.recommendedActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="detail-actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={actionLoading || selected.status === 'investigating'}
                  onClick={() => updateStatus(selected.id, 'investigating')}
                >
                  Mark as investigating
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={actionLoading || selected.status === 'resolved'}
                  onClick={() => updateStatus(selected.id, 'resolved')}
                >
                  Mark as resolved
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => loadPlaybook(selected.incidentType)}
                >
                  View playbook
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={agentLoading}
                  onClick={() => askAgentRemediation(selected)}
                >
                  {agentLoading ? 'Asking agent…' : 'Ask agent for remediation'}
                </button>
              </div>

              {agentReply && (
                <div className="detail-section agent-remediation-pane">
                  <h3>Agent remediation plan</h3>
                  <p className="agent-reply">{agentReply}</p>
                </div>
              )}

              {playbook && (
                <div className="detail-section playbook-section">
                  <h3>{playbook.title}</h3>
                  <ol className="playbook-list">
                    {playbook.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step) => (
                        <li key={step.order}>
                          <strong>{step.action}</strong>
                          <p>{step.details}</p>
                        </li>
                      ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="card card--empty">
              <p className="muted">Select an incident to view details and actions.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
