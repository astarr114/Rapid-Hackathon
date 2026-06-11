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
  timeLabel?: string;
  timeRangeHours?: number;
  hourlyBuckets?: HourlyBucket[];
}

type TimeMode = 'preset' | 'range';

const PRESET_HOURS = [
  { label: '6 hours', value: 6 },
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '7 days', value: 168 },
] as const;

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ObservabilityPage() {
  const [metrics, setMetrics] = useState<ErrorRateData | null>(null);
  const [allLogs, setAllLogs] = useState<LogHit[]>([]);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');

  const [timeMode, setTimeMode] = useState<TimeMode>('preset');
  const [presetHours, setPresetHours] = useState(24);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [appliedLabel, setAppliedLabel] = useState('Last 24h');

  const timePayload = useMemo(() => {
    if (timeMode === 'preset') {
      return { timeRangeHours: presetHours };
    }
    return {
      startTime: new Date(`${startDate}T00:00:00`).toISOString(),
      endTime: new Date(`${endDate}T23:59:59`).toISOString(),
    };
  }, [timeMode, presetHours, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLogsLoading(true);
    setError('');
    try {
      const [metricData, logData] = await Promise.all([
        api<ErrorRateData>('/elastic/get-error-rate', {
          method: 'POST',
          body: JSON.stringify({ index: 'pipeline-logs-*', ...timePayload }),
        }),
        api<{ hits: LogHit[]; timeLabel?: string }>('/elastic/search-logs', {
          method: 'POST',
          body: JSON.stringify({ query: '', index: 'pipeline-logs-*', ...timePayload }),
        }),
      ]);
      setMetrics(metricData);
      setAllLogs(logData.hits);
      setAppliedLabel(metricData.timeLabel ?? `Last ${presetHours}h`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLogsLoading(false);
      setLoading(false);
    }
  }, [timePayload, presetHours]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

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

  function handleApplyTimeframe(e: FormEvent) {
    e.preventDefault();
    loadData();
  }

  const errorRate = metrics?.errorRatePercent ?? 0;
  const maxEvents = Math.max(...(metrics?.hourlyBuckets?.map((b) => b.events) ?? [1]), 1);

  return (
    <>
      <Topbar title="Observability" subtitle="Pipeline logs, error rates, and correlated failures" />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card timeframe-bar">
        <form className="timeframe-bar__form" onSubmit={handleApplyTimeframe}>
          <div className="timeframe-bar__mode">
            <label className="toolbar-field">
              <span>Timeframe</span>
              <select
                value={timeMode}
                onChange={(e) => setTimeMode(e.target.value as TimeMode)}
              >
                <option value="preset">Quick range</option>
                <option value="range">Custom date range</option>
              </select>
            </label>

            {timeMode === 'preset' ? (
              <label className="toolbar-field">
                <span>Range</span>
                <select
                  value={presetHours}
                  onChange={(e) => setPresetHours(Number(e.target.value))}
                >
                  {PRESET_HOURS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="toolbar-field">
                  <span>From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label className="toolbar-field">
                  <span>To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </>
            )}

            <button type="submit" className="btn btn--primary btn--sm" disabled={logsLoading}>
              Apply
            </button>
          </div>
          <span className="timeframe-bar__active muted">Showing: {appliedLabel}</span>
        </form>
      </div>

      <section className="kpi-row kpi-row--3">
        <StatCard label={`Events (${appliedLabel})`} value={loading ? '—' : (metrics?.totalEvents ?? 0)} />
        <StatCard
          label={`Errors (${appliedLabel})`}
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
          <h2 className="card__title">Errors over time ({appliedLabel})</h2>
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
          {['All', 'pipeline-service', 'api-gateway', 'billing-service', 'bigquery-loader'].map((chip) => (
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
                      No matching log entries for this timeframe.
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
