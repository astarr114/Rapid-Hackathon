import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ConnectorUsage } from '../lib/types';
import { formatMar, marChangePercent } from '../lib/format';

export function ConnectorUsagePanel() {
  const [usage, setUsage] = useState<ConnectorUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api<{ usage: ConnectorUsage[] }>('/fivetran/usage-summary');
        setUsage(data.usage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section className="card usage-panel">
      <div className="usage-panel__header">
        <h2 className="card__title">Usage &amp; MAR</h2>
        <p className="muted usage-panel__subtitle">
          Monthly Active Rows (MAR) and estimated credits per connector
        </p>
      </div>

      {error && <div className="alert alert--error alert--compact">{error}</div>}

      {loading ? (
        <p className="muted">Loading usage data…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Connector</th>
                <th>MAR this month</th>
                <th>vs last month</th>
                <th>Est. credits</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => {
                const change = marChangePercent(row.marThisMonth, row.marLastMonth);
                const expensive = row.marThisMonth >= 10_000_000;
                const highChange = change >= 15;
                return (
                  <tr
                    key={row.connectorId}
                    className={expensive ? 'usage-row--expensive' : highChange ? 'usage-row--rising' : undefined}
                  >
                    <td>
                      <strong>{row.connectorName}</strong>
                      <div className="table-sub">{row.connectorId}</div>
                    </td>
                    <td>{formatMar(row.marThisMonth)}</td>
                    <td>
                      <span className={change > 0 ? 'text-warning' : change < 0 ? 'text-success' : 'muted'}>
                        {change > 0 ? '+' : ''}
                        {change}%
                      </span>
                    </td>
                    <td>{row.estCreditsThisMonth}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
