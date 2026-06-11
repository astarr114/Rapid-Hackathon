export function connectorStatusClass(status: string): string {
  if (status === 'active' || status === 'healthy') return 'badge badge--success';
  if (status === 'failed') return 'badge badge--danger';
  if (status === 'warning') return 'badge badge--warning';
  if (status === 'syncing') return 'badge badge--info';
  if (status === 'paused') return 'badge badge--muted';
  return 'badge';
}

export function connectorStatusDot(status: string): string {
  if (status === 'active' || status === 'healthy') return 'status-dot status-dot--ok';
  if (status === 'failed') return 'status-dot status-dot--fail';
  if (status === 'warning') return 'status-dot status-dot--warn';
  if (status === 'paused') return 'status-dot status-dot--paused';
  if (status === 'syncing') return 'status-dot status-dot--sync';
  return 'status-dot';
}

export function severityClass(severity: string): string {
  if (severity === 'critical') return 'badge badge--danger';
  if (severity === 'high') return 'badge badge--warning';
  if (severity === 'medium') return 'badge badge--info';
  return 'badge badge--muted';
}

export function severityLabel(severity: string): string {
  const map: Record<string, string> = {
    critical: 'SEV-1',
    high: 'SEV-2',
    medium: 'SEV-3',
    low: 'SEV-4',
  };
  return map[severity] ?? severity;
}

export function incidentStatusClass(status: string): string {
  if (status === 'open') return 'badge badge--danger';
  if (status === 'investigating') return 'badge badge--warning';
  if (status === 'resolved') return 'badge badge--success';
  if (status === 'mitigated') return 'badge badge--info';
  return 'badge';
}

export function syncStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'succeeded' || s === 'success') return 'badge badge--success';
  if (s === 'failed' || s === 'failure') return 'badge badge--danger';
  if (s === 'partial') return 'badge badge--warning';
  if (s === 'running') return 'badge badge--info';
  return 'badge badge--muted';
}

export function syncStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'success') return 'succeeded';
  if (s === 'failure') return 'failed';
  return status;
}

export function logLevelClass(level: string): string {
  const l = level.toUpperCase();
  if (l === 'ERROR') return 'badge badge--danger';
  if (l === 'WARN') return 'badge badge--warning';
  if (l === 'INFO') return 'badge badge--info';
  return 'badge';
}
