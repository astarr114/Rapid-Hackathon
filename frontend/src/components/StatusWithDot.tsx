import { connectorStatusClass, connectorStatusDot } from '../lib/statusBadge';

export function StatusWithDot({ status }: { status: string }) {
  return (
    <span className="status-with-dot">
      <span className={connectorStatusDot(status)} aria-hidden />
      <span className={connectorStatusClass(status)}>{status}</span>
    </span>
  );
}
