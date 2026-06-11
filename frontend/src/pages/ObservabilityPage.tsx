import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { HourlyBucket, LogHit } from '../lib/types';
import { Topbar } from '../components/Topbar';
import { StatCard } from '../components/StatCard';
import { logLevelClass } from '../lib/statusBadge';

interface ErrorRateData {
  totalEvents: number;
  errorCount: number;
  errorRatePercent: number;
  hourlyBuckets?: HourlyBucket[];
}

const SERVICE_CHIPS = ['All', 'pipeline-service', 'api-gateway', 'billing-service', 'bigquery-loader'];

export function ObservabilityPage() {
  const [metrics, setMetrics] = useState<ErrorRateData | null>(null);
  const [allLogs, setAllLogs] = useState<LogHit[]>([]);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMetrics = useCallback(async () => {
    const data = await api<ErrorRateData>('/elastic/get-error-rate', {
      method: 'POST',
      body: JSON.stringify({ index: 'pipeline-logs-*', timeRangeHours: 24 }),
    });
    setMetrics(data);
  }, []);

  const loadLogs = useCallback(async (q: string) => {
    setLogsLoading(true);
    const data = await api<{ hits: LogHit[] }>('/elastic/search-logs', {
      method: 'POST',
      body: JSON.stringify({ query: q, index: 'pipeline-logs-*', timeRangeHours: 24 }),
    });
    setAllLogs(data.hits);
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        await Promise.all([loadMetrics(), loadLogs('')]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadMetrics, loadLogs]);

  const displayedLogs = useMemo(() => {
    let list = allLogs;
    if (serviceFilter !== 'All') {
      list = list.filter((l) => l.service === serviceFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.level.toLowerCase().includes(q) ||
          (l.connectorId?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [allLogs, serviceFilter, query]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setQuery(searchInput);
  }

  const errorRate = metrics?.errorRatePercent ?? 0;
  const maxEvents = Math.max(...(metrics?.hourlyBuckets?.map((b) => b.events) ?? [1]), 1);

  return (
    <>
      <Topbar title="Observability" subtitle="Pipeline logs, error rates, and correlated failures" />

      {error && <div className="alert alert--error">{error}</div>}

      <section className="kpi-row kpi-row--3">
        <StatCard label="Events (24h)" value={loading ? '—' : (metrics?.totalEvents ?? 0)} />
        <StatCard
          label="Errors (24h)"
          value={loading ? '—' : (metrics?.errorCount ?? 0)}
          tone={(metrics?.errorCount ?? 0) > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Error Rate"
          value={loading ? '—' : `${errorRate}%`}
          tone={errorRate > 10 ? 'danger' : errorRate > 5 ? 'warning' : 'success'}
        />
      </section>

      {metrics?.hourlyBuckets && (
        <div className="card">
          <h2 className="card__title">Errors over time (24h)</h2>
          <div className="error-bars">
            {metrics.hourlyBuckets.map((b) => (
              <div key={b.hour} className="error-bars__col" title={`${b.label}: ${b.errors} errors / ${b.events} events`}>
                <div
                  className="error-bars__events"
                  style={{ height: `${(b.events / maxEvents) * 100}%` }}
                />
                <div
                  className="error-bars__errors"
                  style={{ height: `${(b.errors / maxEvents) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="error-bars__legend">
            <span><i className="legend legend--events" /> Events</span>
            <span><i className="legend legend--errors" /> Errors</span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card__header-row">
          <h2 className="card__title">Log stream</h2>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Filter (e.g. "schema" or conn_ga4_001)'
            />
            <button type="submit" className="btn btn--secondary btn--sm">
              Search
            </button>
          </form>
        </div>

        <div className="filter-chips">
          {SERVICE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`filter-chip${serviceFilter === chip ? ' filter-chip--active' : ''}`}
              onClick={() => setServiceFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {logsLoading ? (
          <p className="muted">Loading logs…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Level</th>
                  <th>Message</th>
                  <th>Service / Connector</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="muted">{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <span className={logLevelClass(log.level)}>{log.level}</span>
                    </td>
                    <td>{log.message}</td>
                    <td className="muted">
                      {log.service}
                      {log.connectorId && ` · ${log.connectorId}`}
                    </td>
                  </tr>
                ))}
                {displayedLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      No matching log entries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
