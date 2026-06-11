import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { LineageGraph, ReliabilityScanResult, SlaPrediction } from '../lib/types';
import { Topbar } from '../components/Topbar';
import { ReliabilityScoreGauge } from '../components/ReliabilityScoreGauge';
import { AgentToolTrace } from '../components/AgentToolTrace';
import { ImpactLineageMap } from '../components/ImpactLineageMap';
import { LiveOpsFeed } from '../components/LiveOpsFeed';
import { useToast } from '../contexts/ToastContext';

export function CommandCenterPage() {
  const { showToast } = useToast();
  const [scan, setScan] = useState<ReliabilityScanResult | null>(null);
  const [predictions, setPredictions] = useState<SlaPrediction[]>([]);
  const [lineage, setLineage] = useState<LineageGraph | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  const runScan = useCallback(async (quiet = false) => {
    setScanning(true);
    try {
      const result = await api<ReliabilityScanResult>('/intelligence/reliability-scan', {
        method: 'POST',
      });
      setScan(result);
      if (!quiet) {
        showToast(`Reliability scan complete — score ${result.score}/100 (${result.grade})`);
      }
    } catch (err) {
      if (!quiet) {
        showToast(err instanceof Error ? err.message : 'Scan failed', 'error');
      }
    } finally {
      setScanning(false);
    }
  }, [showToast]);

  useEffect(() => {
    async function init() {
      try {
        const [predData, lineageData] = await Promise.all([
          api<{ predictions: SlaPrediction[] }>('/intelligence/sla-predictions'),
          api<LineageGraph>('/intelligence/lineage-graph'),
        ]);
        setPredictions(predData.predictions);
        setLineage(lineageData);
        await runScan(true);
      } catch {
        /* partial load ok */
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [runScan]);

  return (
    <>
      <Topbar
        title="Command Center"
        subtitle="AI-powered reliability intelligence — composite scoring, SLA prediction, blast radius"
      />

      <div className="command-center-hero">
        <div className="card command-center-score">
          <ReliabilityScoreGauge
            score={scan?.score ?? 0}
            grade={scan?.grade ?? '—'}
            trend={scan?.trend}
            loading={scanning && !scan}
            size="lg"
          />
          <div className="command-center-score__meta">
            <h2>Platform Reliability Score</h2>
            <p>{scan?.summary ?? 'Run a scan to compute composite reliability.'}</p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={scanning}
              onClick={() => runScan()}
            >
              {scanning ? 'Scanning…' : '⚡ Run Full Reliability Scan'}
            </button>
            {scan && (
              <span className="muted scan-time">
                Last scan: {new Date(scan.scannedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <LiveOpsFeed />
      </div>

      {scan && scan.findings.length > 0 && (
        <div className="card findings-card">
          <h2 className="card__title">Active Findings ({scan.findings.length})</h2>
          <ul className="findings-list">
            {scan.findings.map((f, i) => (
              <li key={i} className={`finding finding--${f.severity}`}>
                <span className="finding__cat">{f.category}</span>
                <span className="finding__msg">{f.message}</span>
                {f.suggestedAction && (
                  <span className="finding__action">→ {f.suggestedAction}</span>
                )}
              </li>
            ))}
          </ul>
          <AgentToolTrace trace={scan.toolTrace} />
        </div>
      )}

      <div className="command-center-grid">
        <div className="card">
          <h2 className="card__title">Predictive SLA Breach Alerts</h2>
          <p className="card__desc muted">
            ML-style forecasting — tables at risk of breaching freshness SLA within 2h
          </p>
          {loading ? (
            <p className="muted">Loading predictions…</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Freshness</th>
                    <th>Breach prob.</th>
                    <th>Risk</th>
                    <th>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.table}>
                      <td><strong>{p.table}</strong></td>
                      <td>{p.currentFreshnessMinutes}m · {p.status}</td>
                      <td>
                        <span className={`breach-prob breach-prob--${p.riskLevel}`}>
                          {p.breachProbability}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge--${p.riskLevel === 'critical' ? 'danger' : p.riskLevel === 'high' ? 'warning' : 'info'}`}>
                          {p.riskLevel}
                        </span>
                      </td>
                      <td className="muted">{p.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ImpactLineageMap graph={lineage} loading={loading} />
      </div>
    </>
  );
}
