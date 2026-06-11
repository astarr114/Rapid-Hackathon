import type { SyncHistoryEntry } from '../lib/types';
import { formatDuration } from '../lib/format';
interface SyncDurationBarsProps {
  runs: SyncHistoryEntry[];
  loading?: boolean;
}

export function SyncDurationBars({ runs, loading }: SyncDurationBarsProps) {
  if (loading) {
    return <p className="muted">Loading sync history…</p>;
  }

  if (runs.length === 0) {
    return <p className="muted">No sync history available.</p>;
  }

  const maxDuration = Math.max(...runs.map((r) => r.durationSeconds), 1);
  const ordered = [...runs].reverse();

  return (
    <div className="sync-bars">
      <div className="sync-bars__legend muted">
        <span>Older</span>
        <span>Recent runs → duration trend</span>
      </div>
      <ul className="sync-bars__list">
        {ordered.map((run, i) => {
          const widthPct = Math.max(8, Math.round((run.durationSeconds / maxDuration) * 100));
          return (
            <li key={i} className="sync-bars__item" title={`${formatDuration(run.durationSeconds)} · ${run.status}`}>
              <span className={`sync-bars__status sync-bars__status--${run.status}`} />
              <div className="sync-bars__track">
                <div
                  className={`sync-bars__fill sync-bars__fill--${run.status}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="sync-bars__label">{formatDuration(run.durationSeconds)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
