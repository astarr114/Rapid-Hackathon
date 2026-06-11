import { StatusWithDot } from './StatusWithDot';
import type { Connector } from '../lib/types';

interface ConnectorTableProps {
  connectors: Connector[];
  loading?: boolean;
}

export function ConnectorTable({ connectors, loading }: ConnectorTableProps) {
  if (loading) {
    return (
      <div className="card">
        <h2 className="card__title">Connectors</h2>
        <p className="muted">Loading connectors…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card__title">Connectors ({connectors.length})</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Source → Dest</th>
              <th>Status</th>
              <th>Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {connectors.slice(0, 5).map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  {c.errorMessage && c.status !== 'active' && (
                    <p className="error-hint">
                      {c.errorMessage.length > 80
                        ? `${c.errorMessage.slice(0, 80)}…`
                        : c.errorMessage}
                    </p>
                  )}
                </td>
                <td>
                  {c.source} → {c.destination}
                </td>
                <td>
                  <StatusWithDot status={c.status} />
                </td>
                <td className="muted">{new Date(c.lastSyncAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {connectors.length > 5 && (
          <p className="muted table-footer-hint">+ {connectors.length - 5} more on Pipelines page</p>
        )}
      </div>
    </div>
  );
}
