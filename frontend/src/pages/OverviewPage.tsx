import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Connector, Incident, ReliabilityScanResult } from '../lib/types';
import { Topbar } from '../components/Topbar';
import { StatCard } from '../components/StatCard';
import { ConnectorTable } from '../components/ConnectorTable';
import { IncidentList } from '../components/IncidentList';
import { ChatPanel } from '../components/ChatPanel';
import { ReliabilityScoreGauge } from '../components/ReliabilityScoreGauge';
import { LiveOpsFeed } from '../components/LiveOpsFeed';

export function OverviewPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [errorRate, setErrorRate] = useState<number>(0);
  const [scan, setScan] = useState<ReliabilityScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadScan = useCallback(async () => {
    try {
      const result = await api<ReliabilityScanResult>('/intelligence/reliability-scan', {
        method: 'POST',
      });
      setScan(result);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [connData, incData, rateData] = await Promise.all([
          api<{ connectors: Connector[] }>('/fivetran/list-connectors', { method: 'POST' }),
          api<{ incidents: Incident[] }>('/mongo/list-incidents'),
          api<{ errorRatePercent: number }>('/elastic/get-error-rate', {
            method: 'POST',
            body: JSON.stringify({ index: 'pipeline-logs-*', timeRangeHours: 24 }),
          }),
        ]);
        setConnectors(connData.connectors);
        setIncidents(incData.incidents);
        setErrorRate(rateData.errorRatePercent);
        await loadScan();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadScan]);

  const failedCount = connectors.filter((c) => c.status === 'failed' || c.status === 'warning').length;

  return (
    <>
      <Topbar
        title="Autonomous Reliability & Operations Agent"
        subtitle="Real-time overview of pipeline health, incidents, and agent assistance"
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="overview-hero">
        <div className="card overview-score-card">
          <ReliabilityScoreGauge
            score={scan?.score ?? 0}
            grade={scan?.grade ?? '—'}
            trend={scan?.trend}
            loading={loading && !scan}
          />
          <div>
            <h2 className="overview-score-card__title">Reliability Score</h2>
            <p className="muted overview-score-card__summary">
              {scan?.summary ?? 'Composite score across pipelines, freshness, errors, and incidents.'}
            </p>
            <Link to="/command-center" className="btn btn--secondary btn--sm">
              Open Command Center →
            </Link>
          </div>
        </div>
        <div className="overview-hero__hint">
          <kbd>Ctrl</kbd>+<kbd>K</kbd> command palette · Live ops feed below
        </div>
      </div>

      <section className="kpi-row">
        <StatCard label="Total Connectors" value={loading ? '—' : connectors.length} />
        <StatCard
          label="At-Risk Connectors"
          value={loading ? '—' : failedCount}
          tone={failedCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Open Incidents"
          value={loading ? '—' : incidents.filter((i) => i.status !== 'resolved').length}
          tone="warning"
        />
        <StatCard
          label="Error Rate (24h)"
          value={loading ? '—' : `${errorRate}%`}
          tone={errorRate > 10 ? 'danger' : 'default'}
        />
      </section>

      <section className="content-grid content-grid--with-feed">
        <div className="content-grid__left">
          <ConnectorTable connectors={connectors} loading={loading} />
          <IncidentList incidents={incidents} loading={loading} />
          <LiveOpsFeed />
        </div>
        <div className="content-grid__right">
          <ChatPanel />
        </div>
      </section>
    </>
  );
}
