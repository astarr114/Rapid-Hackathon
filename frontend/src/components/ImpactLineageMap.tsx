import { useMemo } from 'react';
import type { LineageGraph } from '../lib/types';

const NODE_W = 128;
const NODE_H = 36;
const PAD = 28;

function nodeColor(status: string): string {
  if (status === 'failed' || status === 'CRITICAL' || status === 'IMPACTED') return 'var(--danger)';
  if (status === 'LATE' || status === 'STALE' || status === 'warn') return 'var(--warning)';
  if (status === 'healthy' || status === 'OK' || status === 'active') return 'var(--success)';
  return 'var(--info)';
}

function computeViewBox(graph: LineageGraph): string {
  const xs = graph.nodes.map((n) => n.x);
  const ys = graph.nodes.map((n) => n.y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const maxX = Math.max(...xs) + NODE_W + PAD;
  const maxY = Math.max(...ys) + NODE_H + PAD;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

interface ImpactLineageMapProps {
  graph: LineageGraph | null;
  loading?: boolean;
}

export function ImpactLineageMap({ graph, loading }: ImpactLineageMapProps) {
  const viewBox = useMemo(() => (graph ? computeViewBox(graph) : '0 0 400 200'), [graph]);

  if (loading || !graph) {
    return (
      <div className="card lineage-map lineage-map--wide">
        <h2 className="card__title">Blast Radius Map</h2>
        <p className="muted">Loading lineage graph…</p>
      </div>
    );
  }

  const nodeMap = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));

  return (
    <div className="card lineage-map lineage-map--wide">
      <div className="lineage-map__header">
        <div>
          <h2 className="card__title">Blast Radius Map</h2>
          <p className="lineage-map__subtitle">
            Root cause: <strong>{graph.blastRadius.rootCause}</strong> ·{' '}
            {graph.blastRadius.affectedAssets} assets · {graph.blastRadius.impactedDashboards}{' '}
            dashboards
          </p>
        </div>
        <div className="lineage-map__legend">
          <span className="lineage-legend-item">
            <span className="lineage-legend-dot lineage-legend-dot--critical" /> Critical
          </span>
          <span className="lineage-legend-item">
            <span className="lineage-legend-dot lineage-legend-dot--warn" /> Degraded
          </span>
          <span className="lineage-legend-item">
            <span className="lineage-legend-dot lineage-legend-dot--ok" /> Healthy
          </span>
        </div>
      </div>

      <div className="lineage-map__canvas-wrap">
        <svg
          viewBox={viewBox}
          className="lineage-map__svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Data lineage blast radius diagram"
        >
          <defs>
            <marker id="lineage-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--text-muted)" opacity="0.6" />
            </marker>
          </defs>
          {graph.edges.map((e, i) => {
            const from = nodeMap[e.from];
            const to = nodeMap[e.to];
            if (!from || !to) return null;
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--border)"
                  strokeWidth={1.5}
                  markerEnd="url(#lineage-arrow)"
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                  fill="var(--text-muted)"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {e.label}
                </text>
              </g>
            );
          })}
          {graph.nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="var(--overlay)"
                stroke={nodeColor(n.status)}
                strokeWidth={1.5}
              />
              <circle cx={12} cy={NODE_H / 2} r={4} fill={nodeColor(n.status)} />
              <text x={22} y={15} fill="var(--text)" fontSize="9" fontWeight="600">
                {n.label.length > 14 ? `${n.label.slice(0, 12)}…` : n.label}
              </text>
              <text x={22} y={28} fill="var(--text-muted)" fontSize="8">
                {n.type} · {n.status}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="lineage-map__impact">{graph.blastRadius.estimatedBusinessImpact}</p>
    </div>
  );
}
