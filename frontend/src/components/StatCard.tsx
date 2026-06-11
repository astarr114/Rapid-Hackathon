interface StatCardProps {
  label: string;
  value: string | number;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  );
}
