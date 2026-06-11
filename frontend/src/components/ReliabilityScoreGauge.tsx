interface ReliabilityScoreGaugeProps {
  score: number;
  grade: string;
  trend?: string;
  loading?: boolean;
  size?: 'sm' | 'lg';
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

export function ReliabilityScoreGauge({
  score,
  grade,
  trend,
  loading,
  size = 'sm',
}: ReliabilityScoreGaugeProps) {
  const radius = size === 'lg' ? 72 : 48;
  const stroke = size === 'lg' ? 10 : 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const dim = size === 'lg' ? 180 : 120;

  if (loading) {
    return (
      <div className={`score-gauge score-gauge--${size}`}>
        <div className="score-gauge__placeholder muted">Calculating…</div>
      </div>
    );
  }

  return (
    <div className={`score-gauge score-gauge--${size}`}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--gauge-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          className="score-gauge__arc"
        />
      </svg>
      <div className="score-gauge__center">
        <span className="score-gauge__score">{score}</span>
        <span className="score-gauge__grade">{grade}</span>
      </div>
      {trend && (
        <span className={`score-gauge__trend score-gauge__trend--${trend}`}>
          {trend === 'declining' ? '↓ Declining' : '→ Stable'}
        </span>
      )}
    </div>
  );
}
