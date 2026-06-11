import { useState } from 'react';
import { api } from '../lib/api';
import type { RemediationStep } from '../lib/types';
import { AgentToolTrace } from './AgentToolTrace';
import { useToast } from '../contexts/ToastContext';

interface AutoRemediatePanelProps {
  connectorId: string;
  connectorName: string;
  onComplete?: () => void;
}

export function AutoRemediatePanel({
  connectorId,
  connectorName,
  onComplete,
}: AutoRemediatePanelProps) {
  const { showToast } = useToast();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<RemediationStep[]>([]);
  const [done, setDone] = useState(false);

  async function run() {
    setRunning(true);
    setSteps([]);
    setDone(false);

    try {
      const data = await api<{
        success: boolean;
        steps: RemediationStep[];
        message: string;
      }>('/intelligence/auto-remediate', {
        method: 'POST',
        body: JSON.stringify({ connectorId }),
      });

      for (let i = 0; i < data.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setSteps((prev) => [...prev, { ...data.steps[i], status: 'running' }]);
        await new Promise((r) => setTimeout(r, 400));
        setSteps((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: 'completed' } : s)),
        );
      }

      setDone(true);
      showToast(`Autonomous remediation complete for ${connectorName}`);
      onComplete?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Remediation failed', 'error');
    } finally {
      setRunning(false);
    }
  }

  const toolTrace = steps.map((s) => ({
    tool: s.tool,
    endpoint: s.endpoint,
    durationMs: s.durationMs ?? 0,
    status: (s.status === 'completed' ? 'ok' : s.status === 'failed' ? 'error' : 'warn') as 'ok' | 'warn' | 'error',
    summary: s.message,
  }));

  return (
    <div className="auto-remediate">
      <div className="auto-remediate__header">
        <div>
          <h3>Autonomous Remediation</h3>
          <p className="muted">Agent-orchestrated fix sequence for schema drift</p>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={running}
          onClick={run}
        >
          {running ? 'Running…' : done ? 'Re-run fix' : '⚡ Auto-fix'}
        </button>
      </div>

      {steps.length > 0 && (
        <ol className="remediation-steps">
          {steps.map((s) => (
            <li key={s.step} className={`remediation-step remediation-step--${s.status}`}>
              <span className="remediation-step__num">{s.step}</span>
              <div>
                <strong>{s.tool}</strong>
                <p>{s.message}</p>
              </div>
              <span className="remediation-step__status">{s.status}</span>
            </li>
          ))}
        </ol>
      )}

      {toolTrace.length > 0 && <AgentToolTrace trace={toolTrace} compact />}
    </div>
  );
}
