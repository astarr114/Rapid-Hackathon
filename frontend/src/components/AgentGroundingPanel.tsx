import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AgentStatus } from '../lib/types';

export function AgentGroundingPanel() {
  const [status, setStatus] = useState<AgentStatus | null>(null);

  useEffect(() => {
    api<AgentStatus>('/intelligence/agent-status')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) {
    return (
      <div className="card agent-grounding">
        <h2 className="card__title">Agent Capabilities</h2>
        <p className="muted">Loading agent configuration…</p>
      </div>
    );
  }

  return (
    <div className="card agent-grounding">
      <h2 className="card__title">Agent Capabilities</h2>
      <p className="card__desc muted">
        Google Interactions API · tool orchestration across your data plane
      </p>

      <ul className="agent-capabilities">
        {status.capabilities.map((cap) => (
          <li key={cap}>{cap}</li>
        ))}
      </ul>

      <h3 className="drawer__section-title">Grounding sources</h3>
      <div className="grounding-grid">
        {status.groundingSources.map((src) => (
          <div key={src.id} className="grounding-grid__item">
            <strong>{src.name}</strong>
            <span className="muted">{src.toolCount} tools</span>
          </div>
        ))}
      </div>
    </div>
  );
}
