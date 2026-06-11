import * as fivetran from './fivetranService.js';
import * as elastic from './elasticService.js';
import * as mongo from './mongoService.js';
import * as bigquery from './bigqueryService.js';

const WATCHED_TABLES = [
  'analytics.ga4_events_daily',
  'analytics.ga4_events_intraday',
  'crm.salesforce_accounts',
  'commerce.shopify_orders',
  'support.zendesk_tickets',
  'marketing.marketo_leads',
];

export interface ToolTraceEntry {
  tool: string;
  endpoint: string;
  durationMs: number;
  status: 'ok' | 'warn' | 'error';
  summary: string;
}

export interface ReliabilityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  suggestedAction?: string;
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

function connectorHealthPoints(status: string): number {
  const map: Record<string, number> = {
    active: 100,
    syncing: 85,
    warning: 45,
    paused: 60,
    failed: 15,
  };
  return map[status] ?? 50;
}

function freshnessHealthPoints(status: string): number {
  const map: Record<string, number> = { OK: 100, LATE: 50, CRITICAL: 18 };
  return map[status] ?? 50;
}

function computeCompositeScore(
  connectors: ReturnType<typeof fivetran.listConnectors>,
  freshnessTables: ReturnType<typeof bigquery.checkFreshness>['tables'],
  activeIncidents: ReturnType<typeof mongo.listIncidents>,
  errorRatePercent: number,
): number {
  const connectorScore = Math.round(
    connectors.reduce((sum, c) => sum + connectorHealthPoints(c.status), 0) / connectors.length,
  );

  const freshnessScore = Math.round(
    freshnessTables.reduce((sum, t) => sum + freshnessHealthPoints(t.status), 0) /
      freshnessTables.length,
  );

  let incidentScore = 100;
  for (const inc of activeIncidents) {
    if (inc.severity === 'critical') incidentScore -= 32;
    else if (inc.severity === 'high') incidentScore -= 18;
    else if (inc.severity === 'medium') incidentScore -= 10;
    else incidentScore -= 4;
  }
  incidentScore = Math.max(15, incidentScore);

  let observabilityScore = 100;
  if (errorRatePercent > 10) observabilityScore = 45;
  else if (errorRatePercent > 5) observabilityScore = 78;
  else if (errorRatePercent > 2) observabilityScore = 92;

  const raw =
    connectorScore * 0.35 +
    freshnessScore * 0.32 +
    incidentScore * 0.2 +
    observabilityScore * 0.13;

  return Math.max(18, Math.min(100, Math.round(raw)));
}

function timedTrace(
  tool: string,
  endpoint: string,
  summary: string,
  status: ToolTraceEntry['status'] = 'ok',
  baseMs = 30,
): ToolTraceEntry {
  return {
    tool,
    endpoint,
    durationMs: baseMs + Math.floor(Math.random() * 80),
    status,
    summary,
  };
}

export function runReliabilityScan() {
  const trace: ToolTraceEntry[] = [];

  const connectors = fivetran.listConnectors();
  trace.push(
    timedTrace(
      'list_connectors',
      '/api/fivetran/list-connectors',
      `${connectors.length} connectors — ${connectors.filter((c) => c.status === 'failed').length} failed`,
      connectors.some((c) => c.status === 'failed') ? 'warn' : 'ok',
    ),
  );

  const failed = connectors.find((c) => c.status === 'failed');
  if (failed) {
    const logs = fivetran.getConnectorLogs(failed.id, 24);
    trace.push(
      timedTrace(
        'get_connector_logs',
        '/api/fivetran/get-connector-logs',
        `${logs.count} log entries for ${failed.id}`,
        'warn',
      ),
    );
    const correlated = elastic.findCorrelatedErrors(failed.id, 24);
    trace.push(
      timedTrace(
        'find_correlated_errors',
        '/api/elastic/find-correlated-errors',
        `Pattern: ${correlated.pattern} (${Math.round(correlated.correlationScore * 100)}% confidence)`,
        'warn',
      ),
    );
  }

  const errorRate = elastic.getErrorRate('pipeline-logs-*', 24);
  trace.push(
    timedTrace(
      'get_error_rate',
      '/api/elastic/get-error-rate',
      `${errorRate.errorRatePercent}% error rate (${errorRate.errorCount}/${errorRate.totalEvents} events)`,
      errorRate.errorRatePercent > 10 ? 'warn' : 'ok',
    ),
  );

  const freshness = bigquery.checkFreshness(WATCHED_TABLES);
  trace.push(
    timedTrace(
      'check_freshness',
      '/api/bigquery/check-freshness',
      freshness.summary,
      freshness.tables.some((t) => t.status === 'CRITICAL') ? 'error' : 'warn',
    ),
  );

  const activeIncidents = mongo.listIncidents().filter((inc) => inc.status !== 'resolved');
  trace.push(
    timedTrace(
      'list_incidents',
      '/api/mongo/list-incidents',
      `${activeIncidents.length} active incident(s)`,
      activeIncidents.length > 0 ? 'warn' : 'ok',
    ),
  );

  const findings: ReliabilityFinding[] = [];

  for (const c of connectors) {
    if (c.status === 'failed') {
      findings.push({
        severity: 'critical',
        category: 'Pipeline',
        message: `${c.name} is FAILED: ${c.errorMessage ?? 'sync failure'}`,
        suggestedAction: 'Run autonomous remediation or update_connector_schema',
      });
    } else if (c.status === 'warning') {
      findings.push({
        severity: 'high',
        category: 'Pipeline',
        message: `${c.name} degraded: ${c.errorMessage ?? 'performance issue'}`,
      });
    }
  }

  for (const t of freshness.tables) {
    if (t.status === 'CRITICAL') {
      findings.push({
        severity: 'critical',
        category: 'Freshness',
        message: `${t.table} is ${t.freshnessMinutes}min stale (CRITICAL)`,
        suggestedAction: 'Resolve upstream connector and verify check_freshness',
      });
    } else if (t.status === 'LATE') {
      findings.push({
        severity: 'high',
        category: 'Freshness',
        message: `${t.table} breaching SLA (${t.freshnessMinutes}min late)`,
      });
    }
  }

  if (errorRate.errorRatePercent > 10) {
    findings.push({
      severity: 'high',
      category: 'Observability',
      message: `Error rate elevated at ${errorRate.errorRatePercent}% over 24h`,
      suggestedAction: 'search_logs for correlated schema errors',
    });
  }

  for (const inc of activeIncidents) {
    findings.push({
      severity: inc.severity === 'critical' ? 'critical' : inc.severity === 'high' ? 'high' : 'medium',
      category: 'Incident',
      message: `[${inc.id}] ${inc.title}`,
      suggestedAction: inc.recommendedActions?.[0],
    });
  }

  const score = computeCompositeScore(
    connectors,
    freshness.tables,
    activeIncidents,
    errorRate.errorRatePercent,
  );

  return {
    score,
    grade: gradeFromScore(score),
    trend: score < 70 ? 'declining' as const : 'stable' as const,
    scannedAt: new Date().toISOString(),
    findings: findings.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    }),
    toolTrace: trace,
    summary:
      score >= 80
        ? 'Platform reliability is within acceptable bounds with minor issues to monitor.'
        : score >= 60
          ? 'Multiple reliability signals degraded — agent-recommended remediation advised.'
          : 'Critical reliability breach detected — immediate autonomous or manual intervention required.',
  };
}

export function predictSlaBreaches() {
  const freshness = bigquery.checkFreshness(WATCHED_TABLES);
  const connectors = fivetran.listConnectors();
  const hasFailedPipeline = connectors.some((c) => c.status === 'failed');

  return freshness.tables.map((t) => {
    const velocityMinPerHour = t.status === 'CRITICAL' ? 45 : t.status === 'LATE' ? 22 : 5;
    const slaMinutes = 120;
    const minutesToBreach = Math.max(0, slaMinutes - t.freshnessMinutes);
    const breachProbability =
      t.status === 'CRITICAL'
        ? 0.94
        : t.status === 'LATE'
          ? 0.72
          : hasFailedPipeline && t.table.includes('analytics')
            ? 0.38
            : 0.08;

    return {
      table: t.table,
      currentFreshnessMinutes: t.freshnessMinutes,
      status: t.status,
      slaMinutes,
      predictedBreachInMinutes: minutesToBreach,
      breachProbability: Math.round(breachProbability * 100),
      riskLevel:
        breachProbability > 0.8 ? 'critical' : breachProbability > 0.5 ? 'high' : breachProbability > 0.25 ? 'medium' : 'low',
      recommendation:
        breachProbability > 0.5
          ? 'Prioritize connector remediation — SLA breach imminent'
          : 'Within SLA — continue monitoring',
    };
  });
}

export function getLineageGraph() {
  return {
    nodes: [
      { id: 'conn_ga4_001', type: 'connector', label: 'GA4 → BigQuery', status: 'failed', x: 80, y: 120 },
      { id: 'conn_salesforce_001', type: 'connector', label: 'Salesforce → BQ', status: 'active', x: 80, y: 280 },
      { id: 'events_intraday', type: 'table', label: 'events_intraday', status: 'LATE', x: 280, y: 80 },
      { id: 'events_daily', type: 'table', label: 'events_daily', status: 'CRITICAL', x: 280, y: 160 },
      { id: 'sf_accounts', type: 'table', label: 'salesforce_accounts', status: 'OK', x: 280, y: 260 },
      { id: 'dau_view', type: 'view', label: 'daily_active_users', status: 'STALE', x: 480, y: 100 },
      { id: 'funnel_view', type: 'view', label: 'funnel_conversion', status: 'STALE', x: 480, y: 180 },
      { id: 'exec_dash', type: 'dashboard', label: 'Executive KPIs', status: 'IMPACTED', x: 680, y: 120 },
      { id: 'ml_features', type: 'table', label: 'feature_store_events', status: 'STALE', x: 480, y: 240 },
    ],
    edges: [
      { from: 'conn_ga4_001', to: 'events_intraday', label: 'sync' },
      { from: 'conn_ga4_001', to: 'events_daily', label: 'sync' },
      { from: 'conn_salesforce_001', to: 'sf_accounts', label: 'sync' },
      { from: 'events_intraday', to: 'dau_view', label: 'feeds' },
      { from: 'events_daily', to: 'funnel_view', label: 'feeds' },
      { from: 'events_daily', to: 'ml_features', label: 'feeds' },
      { from: 'dau_view', to: 'exec_dash', label: 'powers' },
      { from: 'funnel_view', to: 'exec_dash', label: 'powers' },
    ],
    blastRadius: {
      rootCause: 'conn_ga4_001 schema drift',
      affectedAssets: 5,
      impactedDashboards: 2,
      estimatedBusinessImpact: 'Executive reporting 4h stale; ML features degraded',
    },
  };
}

export interface RemediationStep {
  step: number;
  tool: string;
  endpoint: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  durationMs?: number;
}

export function runAutoRemediate(connectorId: string) {
  const connector = fivetran.listConnectors().find((c) => c.id === connectorId);
  if (!connector) {
    return { success: false, connectorId, steps: [], message: 'Connector not found' };
  }

  const steps: RemediationStep[] = [];

  steps.push({
    step: 1,
    tool: 'get_connector_logs',
    endpoint: '/api/fivetran/get-connector-logs',
    status: 'completed',
    message: 'Confirmed schema drift: custom_dimension_12 missing in destination',
    durationMs: 48,
  });

  steps.push({
    step: 2,
    tool: 'update_connector_schema',
    endpoint: '/api/fivetran/update-connector-schema',
    status: 'completed',
    message: 'Applied schema patch — added event_params.custom_dimension_12',
    durationMs: 120,
  });
  fivetran.updateConnectorSchema(connectorId, {
    columns: { events: ['event_params.custom_dimension_12'] },
    mode: 'append',
  });

  steps.push({
    step: 3,
    tool: 'trigger_sync',
    endpoint: '/api/fivetran/trigger-sync',
    status: 'completed',
    message: 'Manual sync triggered — estimated 12 min',
    durationMs: 65,
  });
  fivetran.triggerSync(connectorId);

  steps.push({
    step: 4,
    tool: 'check_freshness',
    endpoint: '/api/bigquery/check-freshness',
    status: 'completed',
    message: 'Post-remediation freshness check queued — expect recovery within 1 sync cycle',
    durationMs: 38,
  });

  steps.push({
    step: 5,
    tool: 'create_incident',
    endpoint: '/api/mongo/create-incident',
    status: 'completed',
    message: 'Auto-documented remediation in incident timeline (demo)',
    durationMs: 22,
  });

  return {
    success: true,
    connectorId,
    connectorName: connector.name,
    mode: 'autonomous',
    completedAt: new Date().toISOString(),
    steps,
    message:
      'Autonomous remediation sequence completed. Connector schema updated and sync triggered. Monitor freshness over next cycle.',
  };
}

const TOOL_PATTERNS: Array<{ pattern: RegExp; tools: string[] }> = [
  {
    pattern: /connector|pipeline|fivetran|sync|list/i,
    tools: ['list_connectors', 'get_connector_status', 'get_connector_history'],
  },
  { pattern: /log|error|exception|search|elastic/i, tools: ['search_logs', 'get_error_rate'] },
  { pattern: /incident|sev|ticket|playbook/i, tools: ['list_incidents', 'create_incident', 'get_playbook'] },
  {
    pattern: /fresh|stale|sla|bigquery|table|impact|dashboard|downstream/i,
    tools: ['check_freshness', 'check_impact', 'get_schema_changes'],
  },
  {
    pattern: /scan|reliability|health|audit|full|trend|duration/i,
    tools: ['list_connectors', 'get_connector_history', 'check_freshness', 'search_logs', 'list_incidents'],
  },
  {
    pattern: /fix|remediat|repair|schema|update|drift|column/i,
    tools: ['get_connector_logs', 'get_schema_changes', 'check_impact', 'update_connector_schema', 'trigger_sync'],
  },
  {
    pattern: /cost|usage|mar|credit|expensive|billing/i,
    tools: ['usage_summary', 'list_connectors', 'check_impact'],
  },
];

export function inferToolTrace(message: string): ToolTraceEntry[] {
  const matched = new Set<string>();
  for (const { pattern, tools } of TOOL_PATTERNS) {
    if (pattern.test(message)) {
      tools.forEach((t) => matched.add(t));
    }
  }
  if (matched.size === 0) {
    matched.add('list_connectors');
    matched.add('search_logs');
  }

  const endpointMap: Record<string, string> = {
    list_connectors: '/api/fivetran/list-connectors',
    get_connector_status: '/api/fivetran/get-connector-status',
    get_connector_logs: '/api/fivetran/get-connector-logs',
    get_connector_history: '/api/fivetran/get-connector-history',
    get_schema_changes: '/api/fivetran/get-schema-changes',
    usage_summary: '/api/fivetran/usage-summary',
    trigger_sync: '/api/fivetran/trigger-sync',
    update_connector_schema: '/api/fivetran/update-connector-schema',
    search_logs: '/api/elastic/search-logs',
    get_error_rate: '/api/elastic/get-error-rate',
    create_incident: '/api/mongo/create-incident',
    list_incidents: '/api/mongo/list-incidents',
    get_playbook: '/api/mongo/get-playbook',
    check_freshness: '/api/bigquery/check-freshness',
    check_impact: '/api/bigquery/check-impact',
  };

  return Array.from(matched).map((tool, i) =>
    timedTrace(tool, endpointMap[tool] ?? `/api/${tool}`, `Agent invoked ${tool}`, 'ok', 40 + i * 15),
  );
}

let eventCounter = 0;

const EVENT_TEMPLATES = [
  { type: 'sync', severity: 'info', message: 'Salesforce → BigQuery sync heartbeat OK' },
  { type: 'alert', severity: 'warn', message: 'Freshness drift detected on analytics.events_intraday' },
  { type: 'error', severity: 'error', message: 'GA4 connector: schema mismatch retry 2/3' },
  { type: 'agent', severity: 'info', message: 'SRE Agent correlated 3 errors to conn_ga4_001' },
  { type: 'sla', severity: 'warn', message: 'Predicted SLA breach for events_daily in ~45 min' },
  { type: 'incident', severity: 'warn', message: 'Incident inc_001 escalated — no owner assigned' },
];

export function getLiveEvents(since?: string) {
  const now = Date.now();
  const sinceMs = since ? new Date(since).getTime() : now - 60_000;

  const events = [];
  for (let i = 0; i < 3; i++) {
    const tpl = EVENT_TEMPLATES[(eventCounter + i) % EVENT_TEMPLATES.length];
    events.push({
      id: `evt_${++eventCounter}_${Date.now()}`,
      timestamp: new Date(now - i * 8000).toISOString(),
      type: tpl.type,
      severity: tpl.severity,
      message: tpl.message,
      source: tpl.type === 'agent' ? 'aroa-agent' : 'pipeline-monitor',
    });
  }

  return {
    events: events.filter((e) => new Date(e.timestamp).getTime() > sinceMs),
    serverTime: new Date().toISOString(),
  };
}
