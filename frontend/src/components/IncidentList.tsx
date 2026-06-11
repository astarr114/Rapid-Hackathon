interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

interface IncidentListProps {
  incidents: Incident[];
  loading?: boolean;
}

function severityClass(severity: string) {
  if (severity === 'critical') return 'badge badge--danger';
  if (severity === 'high') return 'badge badge--warning';
  if (severity === 'medium') return 'badge badge--info';
  return 'badge';
}

export function IncidentList({ incidents, loading }: IncidentListProps) {
  if (loading) {
    return (
      <div className="card">
        <h2 className="card__title">Incidents</h2>
        <p className="muted">Loading incidents…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card__title">Incidents</h2>
      <ul className="incident-list">
        {incidents.map((inc) => (
          <li key={inc.id} className="incident-item">
            <div className="incident-item__header">
              <span className="incident-item__title">{inc.title}</span>
              <span className={severityClass(inc.severity)}>{inc.severity}</span>
            </div>
            <p className="incident-item__summary">{inc.summary}</p>
            <span className="incident-item__meta">
              {inc.id} · {inc.status}
            </span>
          </li>
        ))}
        {incidents.length === 0 && <p className="muted">No open incidents.</p>}
      </ul>
    </div>
  );
}
