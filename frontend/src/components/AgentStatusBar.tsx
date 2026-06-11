import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AgentStatus } from '../lib/types';

export function AgentStatusBar() {
  const [status, setStatus] = useState<AgentStatus | null>(null);

  useEffect(() => {
    api<AgentStatus>('/intelligence/agent-status')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <div className="agent-status-bar">
      <div className="agent-status-bar__left">
        <span className={`agent-status-bar__dot agent-status-bar__dot--${status.connected ? 'live' : 'demo'}`} />
        <span className="agent-status-bar__title">
          Google Agent Builder · {status.modelFamily}
        </span>
        <span className={`badge badge--${status.connected ? 'success' : 'warning'}`}>
          {status.connected ? 'Live' : 'Demo'}
        </span>
      </div>
      <div className="agent-status-bar__meta muted">
        <span title={status.agentId}>Agent {status.agentId}</span>
        <span>·</span>
        <span>{status.groundingSourceCount} grounded sources</span>
        <span>·</span>
        <span>API {status.apiRevision}</span>
        {status.sessionContinuity && (
          <>
            <span>·</span>
            <span>Session memory</span>
          </>
        )}
      </div>
    </div>
  );
}
