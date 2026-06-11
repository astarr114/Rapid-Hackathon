// TODO: Swap synthetic logs for real Elasticsearch queries

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  connectorId?: string;
  message: string;
  index: string;
}

const mins = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

const syntheticLogs: LogEntry[] = [
  {
    timestamp: mins(15),
    level: 'ERROR',
    service: 'pipeline-service',
    connectorId: 'conn_ga4_001',
    message: 'Sync failed for conn_ga4_001: unexpected column event_params.custom_dimension_12',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(22),
    level: 'ERROR',
    service: 'pipeline-service',
    connectorId: 'conn_ga4_001',
    message: 'Schema mismatch on events_intraday — sync aborted after 3 retries',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(35),
    level: 'WARN',
    service: 'pipeline-service',
    connectorId: 'conn_zendesk_001',
    message: 'High latency detected in pipeline-service — Zendesk sync 47m (SLA 30m)',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(40),
    level: 'WARN',
    service: 'pipeline-service',
    connectorId: 'conn_shopify_001',
    message: 'Partial sync for conn_shopify_001 — 450 rows deferred to next run',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(55),
    level: 'ERROR',
    service: 'api-gateway',
    connectorId: 'conn_postgres_001',
    message: 'Auth error when connecting to Postgres source — token expired, auto-refreshed',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(90),
    level: 'INFO',
    service: 'pipeline-service',
    connectorId: 'conn_salesforce_001',
    message: 'Sync completed — 142,891 rows loaded in 6m 04s',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(120),
    level: 'INFO',
    service: 'billing-service',
    message: 'Daily billing reconciliation job started',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(180),
    level: 'WARN',
    service: 'bigquery-loader',
    connectorId: 'conn_ga4_001',
    message: 'Data freshness SLA breached for analytics.ga4_events_daily (300 min late)',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(240),
    level: 'INFO',
    service: 'api-gateway',
    connectorId: 'conn_postgres_001',
    message: 'Postgres connector heartbeat OK — 8,412 rows synced',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(360),
    level: 'ERROR',
    service: 'pipeline-service',
    connectorId: 'conn_marketo_001',
    message: 'Connector conn_marketo_001 paused — no sync in 24h, attribution data stale',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(420),
    level: 'INFO',
    service: 'billing-service',
    message: 'Usage metering export completed — 2,500 events processed',
    index: 'pipeline-logs-*',
  },
  {
    timestamp: mins(480),
    level: 'WARN',
    service: 'api-gateway',
    message: 'Elevated 429 rate from Shopify API — throttling applied',
    index: 'pipeline-logs-*',
  },
];

const DEMO_TOTAL = 2500;
const DEMO_ERRORS = 125;

export function searchLogs(query: string, index = 'pipeline-logs-*', timeRangeHours = 24) {
  const cutoff = Date.now() - timeRangeHours * 60 * 60 * 1000;
  const q = query.toLowerCase();
  const hits = syntheticLogs.filter((log) => {
    const inRange = new Date(log.timestamp).getTime() >= cutoff;
    const matchesIndex = log.index === index || index.includes('*');
    const matchesQuery =
      !q ||
      log.message.toLowerCase().includes(q) ||
      log.level.toLowerCase().includes(q) ||
      log.service.toLowerCase().includes(q) ||
      (log.connectorId?.toLowerCase().includes(q) ?? false);
    return inRange && matchesIndex && matchesQuery;
  });

  return {
    query,
    index,
    timeRangeHours,
    total: hits.length,
    hits: hits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  };
}

export function getErrorRate(index = 'pipeline-logs-*', timeRangeHours = 24) {
  const errorRatePercent = Math.round((DEMO_ERRORS / DEMO_TOTAL) * 1000) / 10;
  return {
    index,
    timeRangeHours,
    totalEvents: DEMO_TOTAL,
    errorCount: DEMO_ERRORS,
    errorRate: DEMO_ERRORS / DEMO_TOTAL,
    errorRatePercent,
    trend: 'stable' as const,
    summary: `${errorRatePercent}% error rate (${DEMO_ERRORS}/${DEMO_TOTAL} events) — primarily GA4 schema failures and Zendesk latency`,
    hourlyBuckets: buildHourlyBuckets(),
  };
}

function buildHourlyBuckets() {
  const buckets = [];
  for (let h = 23; h >= 0; h--) {
    const base = h < 6 ? 80 : h < 12 ? 120 : 100;
    const errors = h === 5 || h === 4 ? 18 : h === 8 ? 12 : Math.floor(Math.random() * 8);
    buckets.push({ hour: h, label: `${h}h ago`, events: base + Math.floor(Math.random() * 40), errors });
  }
  return buckets;
}

export function findCorrelatedErrors(connectorId: string, timeRangeHours = 24) {
  const { hits } = searchLogs(connectorId, 'pipeline-logs-*', timeRangeHours);
  const errors = hits.filter((h) => h.level === 'ERROR');
  const pattern =
    connectorId.includes('ga4') ? 'schema_drift' :
    connectorId.includes('zendesk') ? 'latency_degradation' :
    connectorId.includes('shopify') ? 'partial_sync' : 'general_failure';

  return {
    connectorId,
    timeRangeHours,
    correlationScore: errors.length > 0 ? 0.88 + errors.length * 0.02 : 0.3,
    pattern,
    relatedErrors: errors,
    recommendation: `Review get_connector_logs for ${connectorId} and run check_freshness on downstream tables`,
  };
}

export function getAllLogsForClient() {
  return syntheticLogs;
}
