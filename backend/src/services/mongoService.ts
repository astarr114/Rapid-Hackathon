import type {
  CreateIncidentPayload,
  Incident,
  IncidentFilters,
  Playbook,
} from '../types/incidents.js';

// TODO: Replace in-memory store with real MongoDB / incident management API
const incidents: Incident[] = [
  {
    id: 'inc_001',
    title: 'Sales dashboard broken (GA4 schema change)',
    summary:
      'Executive sales dashboard showing stale data. GA4 connector failed 5h ago due to new custom_dimension_12 column. Revenue attribution off by ~12%.',
    severity: 'critical',
    status: 'open',
    connectorId: 'conn_ga4_001',
    incidentType: 'schema_change',
    rootCause: 'GA4 property added event_params.custom_dimension_12; Fivetran destination schema not reconciled.',
    recommendedActions: [
      'Run update_connector_schema for conn_ga4_001',
      'Trigger manual sync and verify analytics.ga4_events_daily freshness',
      'Notify analytics-team and pause dependent Looker dashboards',
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'inc_002',
    title: 'Customer support reporting delayed (Zendesk slow sync)',
    summary:
      'Support overview dashboard 95 minutes behind. Zendesk connector sync took 47m vs 30m SLA. CS managers reporting incomplete ticket counts.',
    severity: 'high',
    status: 'investigating',
    connectorId: 'conn_zendesk_001',
    incidentType: 'performance',
    rootCause: 'Zendesk API pagination timeout under high ticket volume; partial batch commits.',
    recommendedActions: [
      'Increase sync parallelism or extend sync window',
      'Monitor conn_zendesk_001 next 3 sync cycles',
      'Consider temporary cache layer for support metrics',
    ],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inc_003',
    title: 'Marketing attribution data late (Marketo paused)',
    summary:
      'Marketo connector paused during maintenance. Campaign attribution models missing 24h of lead activity data.',
    severity: 'medium',
    status: 'resolved',
    connectorId: 'conn_marketo_001',
    incidentType: 'operational',
    rootCause: 'Connector manually paused for schema migration — not resumed after maintenance window.',
    recommendedActions: [
      'Resume conn_marketo_001 and trigger backfill sync',
      'Validate marketing.marketo_leads freshness',
    ],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inc_004',
    title: 'Revenue report missing yesterday\'s orders (Shopify partial sync)',
    summary:
      'Finance daily revenue report missing 450 Shopify orders from yesterday. Partial sync due to API rate limiting.',
    severity: 'high',
    status: 'open',
    connectorId: 'conn_shopify_001',
    incidentType: 'partial_sync',
    rootCause: 'Shopify REST API 429 rate limits during peak order window; 450 rows deferred.',
    recommendedActions: [
      'Trigger manual sync for conn_shopify_001',
      'Verify commerce.shopify_orders row counts vs source',
      'Schedule off-peak sync window to avoid rate limits',
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const playbooks: Record<string, Playbook> = {
  schema_change: {
    incidentType: 'schema_change',
    title: 'Schema Change Incident Playbook',
    steps: [
      { order: 1, action: 'Identify drift', details: 'Use get_connector_logs and search_logs to confirm new columns.' },
      { order: 2, action: 'Assess impact', details: 'Run check_freshness and check_impact on affected BigQuery tables.' },
      { order: 3, action: 'Remediate', details: 'Call update_connector_schema, then trigger_sync.' },
      { order: 4, action: 'Verify & close', details: 'Confirm error rate drops and freshness returns to OK.' },
    ],
  },
  performance: {
    incidentType: 'performance',
    title: 'Pipeline Performance Playbook',
    steps: [
      { order: 1, action: 'Baseline', details: 'Compare sync duration against 7-day average.' },
      { order: 2, action: 'Isolate', details: 'Check connector logs for throttling or API rate limits.' },
      { order: 3, action: 'Mitigate', details: 'Reschedule sync window or increase parallelism.' },
    ],
  },
  partial_sync: {
    incidentType: 'partial_sync',
    title: 'Partial Sync Playbook',
    steps: [
      { order: 1, action: 'Quantify gap', details: 'Compare source row counts vs destination.' },
      { order: 2, action: 'Retry', details: 'Trigger manual sync during off-peak hours.' },
      { order: 3, action: 'Validate', details: 'Run check_freshness and notify downstream consumers.' },
    ],
  },
  operational: {
    incidentType: 'operational',
    title: 'Operational Pause Playbook',
    steps: [
      { order: 1, action: 'Confirm intent', details: 'Verify pause was intentional vs accidental.' },
      { order: 2, action: 'Resume', details: 'Resume connector and trigger backfill if needed.' },
    ],
  },
};

let nextId = 5;

export function getIncidentCount(): number {
  return incidents.length;
}

export function createIncident(payload: CreateIncidentPayload) {
  const now = new Date().toISOString();
  const incident: Incident = {
    id: `inc_${String(nextId++).padStart(3, '0')}`,
    ...payload,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  incidents.push(incident);
  return { id: incident.id, incident };
}

export function listIncidents(filters?: IncidentFilters) {
  return incidents.filter((inc) => {
    if (filters?.status && inc.status !== filters.status) return false;
    if (filters?.severity && inc.severity !== filters.severity) return false;
    if (filters?.connectorId && inc.connectorId !== filters.connectorId) return false;
    return true;
  });
}

export function updateIncident(id: string, updates: Partial<Incident>) {
  const idx = incidents.findIndex((i) => i.id === id);
  if (idx === -1) return { success: false as const, message: 'Incident not found' };
  incidents[idx] = {
    ...incidents[idx],
    ...updates,
    id: incidents[idx].id,
    updatedAt: new Date().toISOString(),
  };
  return { success: true as const, incident: incidents[idx] };
}

export function getPlaybook(incidentType: string): Playbook {
  return (
    playbooks[incidentType] ?? {
      incidentType,
      title: 'Generic Incident Playbook',
      steps: [
        { order: 1, action: 'Triage', details: 'Gather logs and connector status.' },
        { order: 2, action: 'Mitigate', details: 'Apply fix or escalate to on-call.' },
      ],
    }
  );
}
