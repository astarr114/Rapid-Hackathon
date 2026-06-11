// TODO: Swap synthetic logs for real Elasticsearch queries

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  connectorId?: string;
  message: string;
  index: string;
}

export interface TimeWindow {
  startMs: number;
  endMs: number;
  timeRangeHours: number;
  label: string;
}

const mins = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

const syntheticLogs: LogEntry[] = [
  { timestamp: mins(15), level: 'ERROR', service: 'pipeline-service', connectorId: 'conn_ga4_001', message: 'Sync failed for conn_ga4_001: unexpected column event_params.custom_dimension_12', index: 'pipeline-logs-*' },
  { timestamp: mins(22), level: 'ERROR', service: 'pipeline-service', connectorId: 'conn_ga4_001', message: 'Schema mismatch on events_intraday — sync aborted after 3 retries', index: 'pipeline-logs-*' },
  { timestamp: mins(35), level: 'WARN', service: 'pipeline-service', connectorId: 'conn_zendesk_001', message: 'High latency detected in pipeline-service — Zendesk sync 47m (SLA 30m)', index: 'pipeline-logs-*' },
  { timestamp: mins(40), level: 'WARN', service: 'pipeline-service', connectorId: 'conn_shopify_001', message: 'Partial sync for conn_shopify_001 — 450 rows deferred to next run', index: 'pipeline-logs-*' },
  { timestamp: mins(55), level: 'ERROR', service: 'api-gateway', connectorId: 'conn_postgres_001', message: 'Auth error when connecting to Postgres source — token expired, auto-refreshed', index: 'pipeline-logs-*' },
  { timestamp: mins(90), level: 'INFO', service: 'pipeline-service', connectorId: 'conn_salesforce_001', message: 'Sync completed — 142,891 rows loaded in 6m 04s', index: 'pipeline-logs-*' },
  { timestamp: mins(120), level: 'INFO', service: 'billing-service', message: 'Daily billing reconciliation job started', index: 'pipeline-logs-*' },
  { timestamp: mins(180), level: 'WARN', service: 'bigquery-loader', connectorId: 'conn_ga4_001', message: 'Data freshness SLA breached for analytics.ga4_events_daily (300 min late)', index: 'pipeline-logs-*' },
  { timestamp: mins(240), level: 'INFO', service: 'api-gateway', connectorId: 'conn_postgres_001', message: 'Postgres connector heartbeat OK — 8,412 rows synced', index: 'pipeline-logs-*' },
  { timestamp: mins(360), level: 'ERROR', service: 'pipeline-service', connectorId: 'conn_marketo_001', message: 'Connector conn_marketo_001 paused — no sync in 24h, attribution data stale', index: 'pipeline-logs-*' },
  { timestamp: mins(420), level: 'INFO', service: 'billing-service', message: 'Usage metering export completed — 2,500 events processed', index: 'pipeline-logs-*' },
  { timestamp: mins(480), level: 'WARN', service: 'api-gateway', message: 'Elevated 429 rate from Shopify API — throttling applied', index: 'pipeline-logs-*' },
  { timestamp: mins(600), level: 'ERROR', service: 'pipeline-service', connectorId: 'conn_ga4_001', message: 'Retry 1/3 failed — destination schema out of date', index: 'pipeline-logs-*' },
  { timestamp: mins(720), level: 'WARN', service: 'pipeline-service', connectorId: 'conn_zendesk_001', message: 'Zendesk pagination timeout — batch 14 of 22 incomplete', index: 'pipeline-logs-*' },
  { timestamp: mins(900), level: 'INFO', service: 'pipeline-service', connectorId: 'conn_shopify_001', message: 'Shopify sync completed — 12,850 orders loaded', index: 'pipeline-logs-*' },
  { timestamp: mins(1080), level: 'ERROR', service: 'bigquery-loader', connectorId: 'conn_ga4_001', message: 'Load job failed — incompatible schema for events_daily partition', index: 'pipeline-logs-*' },
  { timestamp: mins(1320), level: 'INFO', service: 'pipeline-service', connectorId: 'conn_salesforce_001', message: 'Salesforce incremental sync — 98,200 rows', index: 'pipeline-logs-*' },
  { timestamp: mins(1560), level: 'WARN', service: 'api-gateway', connectorId: 'conn_postgres_001', message: 'Connection pool saturation — 92% utilization', index: 'pipeline-logs-*' },
  { timestamp: mins(1800), level: 'INFO', service: 'billing-service', message: 'Weekly usage rollup completed', index: 'pipeline-logs-*' },
  { timestamp: mins(2100), level: 'ERROR', service: 'pipeline-service', connectorId: 'conn_ga4_001', message: 'GA4 export quota warning — approaching daily limit', index: 'pipeline-logs-*' },
  { timestamp: mins(2400), level: 'INFO', service: 'pipeline-service', connectorId: 'conn_zendesk_001', message: 'Zendesk full sync completed in 38m', index: 'pipeline-logs-*' },
  { timestamp: mins(2880), level: 'WARN', service: 'pipeline-service', connectorId: 'conn_marketo_001', message: 'Marketo connector scheduled pause initiated by operator', index: 'pipeline-logs-*' },
  { timestamp: mins(3300), level: 'INFO', service: 'api-gateway', message: 'Certificate rotation completed for internal services', index: 'pipeline-logs-*' },
  { timestamp: mins(3600), level: 'ERROR', service: 'pipeline-service', connectorId: 'conn_shopify_001', message: 'Shopify API 503 — transient outage, sync deferred', index: 'pipeline-logs-*' },
];

export function resolveTimeWindow(opts: {
  timeRangeHours?: number;
  startTime?: string;
  endTime?: string;
}): TimeWindow {
  let endMs = opts.endTime ? new Date(opts.endTime).getTime() : Date.now();
  let startMs: number;

  if (opts.startTime) {
    startMs = new Date(opts.startTime).getTime();
  } else {
    const hours = Math.min(Math.max(opts.timeRangeHours ?? 24, 1), 168);
    startMs = endMs - hours * 60 * 60 * 1000;
  }

  if (startMs > endMs) {
    const tmp = startMs;
    startMs = endMs;
    endMs = tmp;
  }

  const timeRangeHours = Math.max(1, Math.round((endMs - startMs) / (60 * 60 * 1000)));

  const label =
    opts.startTime && opts.endTime
      ? `${new Date(startMs).toLocaleDateString()} – ${new Date(endMs).toLocaleDateString()}`
      : `Last ${timeRangeHours}h`;

  return { startMs, endMs, timeRangeHours, label };
}

function filterLogsInWindow(index: string, window: TimeWindow): LogEntry[] {
  return syntheticLogs.filter((log) => {
    const t = new Date(log.timestamp).getTime();
    const matchesIndex = log.index === index || index.includes('*');
    return t >= window.startMs && t <= window.endMs && matchesIndex;
  });
}

export function searchLogs(
  query: string,
  index = 'pipeline-logs-*',
  opts: { timeRangeHours?: number; startTime?: string; endTime?: string } = {},
) {
  const window = resolveTimeWindow(opts);
  const q = query.toLowerCase();
  const hits = filterLogsInWindow(index, window).filter((log) => {
    if (!q) return true;
    return (
      log.message.toLowerCase().includes(q) ||
      log.level.toLowerCase().includes(q) ||
      log.service.toLowerCase().includes(q) ||
      (log.connectorId?.toLowerCase().includes(q) ?? false)
    );
  });

  return {
    query,
    index,
    timeRangeHours: window.timeRangeHours,
    startTime: new Date(window.startMs).toISOString(),
    endTime: new Date(window.endMs).toISOString(),
    timeLabel: window.label,
    total: hits.length,
    hits: hits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  };
}

function buildHourlyBuckets(window: TimeWindow) {
  const bucketCount = Math.min(24, window.timeRangeHours);
  const bucketSizeHours = window.timeRangeHours / bucketCount;
  const buckets = [];

  for (let i = bucketCount - 1; i >= 0; i--) {
    const bucketEnd = window.endMs - i * bucketSizeHours * 60 * 60 * 1000;
    const bucketStart = bucketEnd - bucketSizeHours * 60 * 60 * 1000;
    const logsInBucket = syntheticLogs.filter((log) => {
      const t = new Date(log.timestamp).getTime();
      return t >= bucketStart && t < bucketEnd;
    });
    const errors = logsInBucket.filter((l) => l.level === 'ERROR').length;
    const events = Math.max(logsInBucket.length * 95, errors * 12 + 40);
    const hoursAgo = Math.round((window.endMs - bucketEnd) / (60 * 60 * 1000));
    const label =
      bucketSizeHours >= 24
        ? new Date(bucketStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : hoursAgo === 0
          ? 'now'
          : `${hoursAgo}h`;

    buckets.push({ hour: i, label, events, errors });
  }

  return buckets;
}

export function getErrorRate(
  index = 'pipeline-logs-*',
  opts: { timeRangeHours?: number; startTime?: string; endTime?: string } = {},
) {
  const window = resolveTimeWindow(opts);
  const logs = filterLogsInWindow(index, window);
  const errorCount = logs.filter((l) => l.level === 'ERROR').length;
  const totalEvents = Math.max(Math.round(logs.length * 95 + 400), errorCount * 10, 100);
  const errorRatePercent = Math.round((errorCount / totalEvents) * 1000) / 10;

  return {
    index,
    timeRangeHours: window.timeRangeHours,
    startTime: new Date(window.startMs).toISOString(),
    endTime: new Date(window.endMs).toISOString(),
    timeLabel: window.label,
    totalEvents,
    errorCount,
    errorRate: errorCount / totalEvents,
    errorRatePercent,
    trend: 'stable' as const,
    summary: `${errorRatePercent}% error rate (${errorCount}/${totalEvents} events) over ${window.label} — primarily GA4 schema failures and Zendesk latency`,
    hourlyBuckets: buildHourlyBuckets(window),
  };
}

export function findCorrelatedErrors(
  connectorId: string,
  opts: { timeRangeHours?: number; startTime?: string; endTime?: string } = {},
) {
  const window = resolveTimeWindow(opts);
  const { hits } = searchLogs(connectorId, 'pipeline-logs-*', opts);
  const errors = hits.filter((h) => h.level === 'ERROR');
  const pattern =
    connectorId.includes('ga4') ? 'schema_drift' :
    connectorId.includes('zendesk') ? 'latency_degradation' :
    connectorId.includes('shopify') ? 'partial_sync' : 'general_failure';

  return {
    connectorId,
    timeRangeHours: window.timeRangeHours,
    correlationScore: errors.length > 0 ? Math.min(0.98, 0.88 + errors.length * 0.02) : 0.3,
    pattern,
    relatedErrors: errors,
    recommendation: `Review get_connector_logs for ${connectorId} and run check_freshness on downstream tables`,
  };
}
