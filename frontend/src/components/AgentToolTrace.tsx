import type { ToolTraceEntry } from '../lib/types';

interface AgentToolTraceProps {
  trace: ToolTraceEntry[];
  compact?: boolean;
}

export function AgentToolTrace({ trace, compact }: AgentToolTraceProps) {
  if (!trace.length) return null;

  return (
    <div className={`tool-trace${compact ? ' tool-trace--compact' : ''}`}>
      <div className="tool-trace__header">
        <span className="tool-trace__icon">⚡</span>
        <span>Agent tool invocations ({trace.length})</span>
      </div>
      <ul className="tool-trace__list">
        {trace.map((t, i) => (
          <li key={i} className={`tool-trace__item tool-trace__item--${t.status}`}>
            <span className="tool-trace__tool">{t.tool}</span>
            <span className="tool-trace__endpoint">{t.endpoint}</span>
            <span className="tool-trace__ms">{t.durationMs}ms</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
