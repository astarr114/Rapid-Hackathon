import type {
  AddConnectorInput,
  Connector,
  ConnectorLog,
  ConnectorUsage,
  SchemaChangeEvent,
  SchemaConfig,
  SyncHistoryEntry,
  UpdateConnectorInput,
} from '../types/connectors.js';
const mins = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();
const minsFuture = (m: number) => new Date(Date.now() + m * 60 * 1000).toISOString();
const secsAgo = (s: number) => new Date(Date.now() - s * 1000).toISOString();
function withSyncTimestamps(
  finishedMinutesAgo: number,
  durationSeconds: number,
  partial: Partial<Connector> & Pick<Connector, 'id' | 'name' | 'source' | 'destination' | 'status' | 'syncState' | 'schedule' | 'lastSyncStatus' | 'avgSyncDurationSeconds' | 'rowsProcessedLastSync' | 'rowsInsertedLastSync' | 'rowsUpdatedLastSync' | 'rowsDeletedLastSync' | 'schemaVersion'>,
): Connector {
  const finishedAt = mins(finishedMinutesAgo);
  const startedAt = secsAgo(finishedMinutesAgo * 60 + durationSeconds);
  return {
    ...partial,
    lastSyncStartedAt: startedAt,
    lastSyncFinishedAt: finishedAt,
    lastSyncAt: finishedAt,
    nextSyncAt: partial.nextSyncAt ?? minsFuture(30),
    primaryTable: partial.primaryTable,
    tables: partial.tables,
    errorMessage: partial.errorMessage,
  } as Connector;
}
// TODO: Swap demo connectors for real Fivetran API responses
const demoConnectors: Connector[] = [
  withSyncTimestamps(10, 364, {
    id: 'conn_salesforce_001',
    name: 'Salesforce â†’ BigQuery',
    source: 'Salesforce',
    destination: 'BigQuery',
    status: 'active',
    syncState: 'scheduled',
    schedule: 'every 30 minutes',
    nextSyncAt: minsFuture(20),
    lastSyncStatus: 'succeeded',
    avgSyncDurationSeconds: 372,
    rowsProcessedLastSync: 142_891,
    rowsInsertedLastSync: 1_240,
    rowsUpdatedLastSync: 140_820,
    rowsDeletedLastSync: 831,
    schemaVersion: 'v2.4.1',
    primaryTable: 'crm.salesforce_accounts',
    tables: ['accounts', 'opportunities', 'contacts'],
  }),
  withSyncTimestamps(300, 420, {
    id: 'conn_ga4_001',
    name: 'GA4 â†’ BigQuery',
    source: 'Google Analytics 4',
    destination: 'BigQuery',
    status: 'failed',
    syncState: 'broken',
    schedule: 'every 1 hour',
    nextSyncAt: minsFuture(0),
    lastSyncStatus: 'failed',
    avgSyncDurationSeconds: 890,
    rowsProcessedLastSync: 0,
    rowsInsertedLastSync: 0,
    rowsUpdatedLastSync: 0,
    rowsDeletedLastSync: 0,
    schemaVersion: 'v1.8.0',
    errorMessage:
      'Schema change detected: new column event_params.custom_dimension_12 added in source. Sync blocked pending schema update.',
    primaryTable: 'analytics.ga4_events_daily',
    tables: ['events_daily', 'events_intraday', 'user_properties'],
  }),
  withSyncTimestamps(12, 228, {
    id: 'conn_postgres_001',
    name: 'Postgres â†’ BigQuery',
    source: 'PostgreSQL',
    destination: 'BigQuery',
    status: 'active',
    syncState: 'scheduled',
    schedule: 'every 15 minutes',
    nextSyncAt: minsFuture(3),
    lastSyncStatus: 'succeeded',
    avgSyncDurationSeconds: 215,
    rowsProcessedLastSync: 8_412,
    rowsInsertedLastSync: 620,
    rowsUpdatedLastSync: 7_680,
    rowsDeletedLastSync: 112,
    schemaVersion: 'v3.1.0',
    primaryTable: 'warehouse.postgres_orders',
    tables: ['orders', 'order_items', 'inventory'],
  }),
  withSyncTimestamps(40, 540, {
    id: 'conn_shopify_001',
    name: 'Shopify â†’ BigQuery',
    source: 'Shopify',
    destination: 'BigQuery',
    status: 'active',
    syncState: 'scheduled',
    schedule: 'every 1 hour',
    nextSyncAt: minsFuture(20),
    lastSyncStatus: 'partial',
    avgSyncDurationSeconds: 612,
    rowsProcessedLastSync: 12_400,
    rowsInsertedLastSync: 11_950,
    rowsUpdatedLastSync: 420,
    rowsDeletedLastSync: 30,
    schemaVersion: 'v1.2.3',
    errorMessage: 'Partial sync: 12,400 of 12,850 order rows loaded â€” API rate limit hit mid-sync.',
    primaryTable: 'commerce.shopify_orders',
    tables: ['orders', 'order_items', 'customers', 'products'],
  }),
  withSyncTimestamps(1440, 1800, {
    id: 'conn_marketo_001',
    name: 'Marketo â†’ BigQuery',
    source: 'Marketo',
    destination: 'BigQuery',
    status: 'paused',
    syncState: 'paused',
    schedule: 'every 6 hours',
    nextSyncAt: minsFuture(0),
    lastSyncStatus: 'succeeded',
    avgSyncDurationSeconds: 1920,
    rowsProcessedLastSync: 284_500,
    rowsInsertedLastSync: 12_400,
    rowsUpdatedLastSync: 271_800,
    rowsDeletedLastSync: 300,
    schemaVersion: 'v0.9.2',
    primaryTable: 'marketing.marketo_leads',
    tables: ['leads', 'campaigns', 'activities'],
  }),
  withSyncTimestamps(95, 2820, {
    id: 'conn_zendesk_001',
    name: 'Zendesk â†’ BigQuery',
    source: 'Zendesk',
    destination: 'BigQuery',
    status: 'warning',
    syncState: 'degraded',
    schedule: 'every 30 minutes',
    nextSyncAt: minsFuture(5),
    lastSyncStatus: 'partial',
    avgSyncDurationSeconds: 2640,
    rowsProcessedLastSync: 18_200,
    rowsInsertedLastSync: 4_100,
    rowsUpdatedLastSync: 13_800,
    rowsDeletedLastSync: 300,
    schemaVersion: 'v1.0.4',
    errorMessage: 'Slow sync: last run took 47m (SLA 30m). Ticket updates may be delayed up to 2h.',
    primaryTable: 'support.zendesk_tickets',
    tables: ['tickets', 'users', 'organizations'],
  }),
];
const demoLogs: ConnectorLog[] = [
  { timestamp: mins(10), level: 'info', message: 'Sync completed â€” 142,891 rows in 6m 04s', connectorId: 'conn_salesforce_001' },
  { timestamp: mins(40), level: 'info', message: 'Incremental sync started for Account, Opportunity objects', connectorId: 'conn_salesforce_001' },
  { timestamp: mins(70), level: 'info', message: 'Schema validation passed â€” no drift detected', connectorId: 'conn_salesforce_001' },
  { timestamp: mins(300), level: 'info', message: 'Sync started for conn_ga4_001', connectorId: 'conn_ga4_001' },
  { timestamp: mins(298), level: 'warn', message: 'Detected schema drift: 1 new column in events_intraday_*', connectorId: 'conn_ga4_001' },
  { timestamp: mins(297), level: 'error', message: 'Sync failed for conn_ga4_001: unexpected column event_params.custom_dimension_12', connectorId: 'conn_ga4_001' },
  { timestamp: mins(240), level: 'error', message: 'Retry 2/3 failed â€” destination schema out of date', connectorId: 'conn_ga4_001' },
  { timestamp: mins(12), level: 'info', message: 'Sync completed â€” 8,412 rows across 3 tables', connectorId: 'conn_postgres_001' },
  { timestamp: mins(27), level: 'info', message: 'Connection pool healthy â€” latency 42ms', connectorId: 'conn_postgres_001' },
  { timestamp: mins(40), level: 'warn', message: 'Partial sync: 450 order rows skipped due to API rate limit', connectorId: 'conn_shopify_001' },
  { timestamp: mins(41), level: 'info', message: 'Loaded 12,400 / 12,850 rows â€” will retry remainder next sync', connectorId: 'conn_shopify_001' },
  { timestamp: mins(1440), level: 'info', message: 'Connector paused by operator â€” maintenance window', connectorId: 'conn_marketo_001' },
  { timestamp: mins(1500), level: 'warn', message: 'Last successful sync before pause â€” 24h ago', connectorId: 'conn_marketo_001' },
  { timestamp: mins(95), level: 'warn', message: 'Sync duration 47m exceeds SLA threshold (30m)', connectorId: 'conn_zendesk_001' },
  { timestamp: mins(96), level: 'error', message: 'High latency detected â€” only 62% of ticket updates applied', connectorId: 'conn_zendesk_001' },
  { timestamp: mins(125), level: 'warn', message: 'Auth token refreshed â€” connection restored', connectorId: 'conn_zendesk_001' },
];
const HISTORY_PROFILES: Record<
  string,
  { baseDuration: number; variance: number; successRate: number; rowsBase: number }
> = {
  conn_salesforce_001: { baseDuration: 372, variance: 40, successRate: 1, rowsBase: 140_000 },
  conn_ga4_001: { baseDuration: 890, variance: 120, successRate: 0.35, rowsBase: 2_400_000 },
  conn_postgres_001: { baseDuration: 215, variance: 25, successRate: 1, rowsBase: 8_000 },
  conn_shopify_001: { baseDuration: 612, variance: 90, successRate: 0.75, rowsBase: 12_500 },
  conn_marketo_001: { baseDuration: 1920, variance: 200, successRate: 0.9, rowsBase: 280_000 },
  conn_zendesk_001: { baseDuration: 2640, variance: 400, successRate: 0.5, rowsBase: 18_000 },
};
const SCHEMA_CHANGES: Record<string, SchemaChangeEvent[]> = {
  conn_ga4_001: [
    {
      timestamp: mins(302),
      eventType: 'alter_table',
      objectType: 'column',
      tableName: 'analytics.ga4_events_daily',
      columnName: 'event_params.custom_dimension_12',
      details: 'New column event_params.custom_dimension_12 added in GA4 source â€” sync blocked pending schema update.',
    },
    {
      timestamp: mins(720),
      eventType: 'alter_table',
      objectType: 'column',
      tableName: 'analytics.ga4_events_intraday',
      columnName: 'event_params.session_engaged',
      details: 'Column type widened from BOOL to STRING in source property.',
    },
    {
      timestamp: mins(2880),
      eventType: 'create_table',
      objectType: 'table',
      tableName: 'analytics.ga4_user_properties',
      details: 'New table user_properties enabled in connector config.',
    },
  ],
  conn_shopify_001: [
    {
      timestamp: mins(180),
      eventType: 'alter_table',
      objectType: 'column',
      tableName: 'commerce.shopify_orders',
      columnName: 'discount_codes',
      details: 'New array column discount_codes detected on orders object.',
    },
    {
      timestamp: mins(1440),
      eventType: 'alter_table',
      objectType: 'column',
      tableName: 'commerce.shopify_orders',
      columnName: 'fulfillment_status',
      details: 'Enum value "partially_fulfilled" added in Shopify API.',
    },
  ],
  conn_salesforce_001: [
    {
      timestamp: mins(4320),
      eventType: 'alter_table',
      objectType: 'column',
      tableName: 'crm.salesforce_opportunities',
      columnName: 'ai_score',
      details: 'Salesforce added AI scoring field on Opportunity object.',
    },
  ],
  conn_zendesk_001: [
    {
      timestamp: mins(480),
      eventType: 'alter_table',
      objectType: 'column',
      tableName: 'support.zendesk_tickets',
      columnName: 'satisfaction_rating',
      details: 'Nullable column satisfaction_rating added â€” no breaking change.',
    },
  ],
  conn_postgres_001: [
    {
      timestamp: mins(10080),
      eventType: 'create_table',
      objectType: 'table',
      tableName: 'warehouse.postgres_inventory',
      details: 'New inventory table added to replication set.',
    },
  ],
  conn_marketo_001: [
    {
      timestamp: mins(2160),
      eventType: 'drop_table',
      objectType: 'table',
      tableName: 'marketing.marketo_legacy_activities',
      details: 'Deprecated activities table removed from source â€” paused during migration.',
    },
  ],
};
const USAGE_SUMMARY: ConnectorUsage[] = [
  {
    connectorId: 'conn_ga4_001',
    connectorName: 'GA4 â†’ BigQuery',
    marThisMonth: 48_200_000,
    marLastMonth: 44_800_000,
    estCreditsThisMonth: 482,
    estCreditsLastMonth: 448,
  },
  {
    connectorId: 'conn_salesforce_001',
    connectorName: 'Salesforce â†’ BigQuery',
    marThisMonth: 12_400_000,
    marLastMonth: 11_900_000,
    estCreditsThisMonth: 124,
    estCreditsLastMonth: 119,
  },
  {
    connectorId: 'conn_shopify_001',
    connectorName: 'Shopify â†’ BigQuery',
    marThisMonth: 9_800_000,
    marLastMonth: 8_200_000,
    estCreditsThisMonth: 98,
    estCreditsLastMonth: 82,
  },
  {
    connectorId: 'conn_zendesk_001',
    connectorName: 'Zendesk â†’ BigQuery',
    marThisMonth: 6_100_000,
    marLastMonth: 5_400_000,
    estCreditsThisMonth: 61,
    estCreditsLastMonth: 54,
  },
  {
    connectorId: 'conn_marketo_001',
    connectorName: 'Marketo â†’ BigQuery',
    marThisMonth: 3_200_000,
    marLastMonth: 3_450_000,
    estCreditsThisMonth: 32,
    estCreditsLastMonth: 35,
  },
  {
    connectorId: 'conn_postgres_001',
    connectorName: 'Postgres â†’ BigQuery',
    marThisMonth: 1_850_000,
    marLastMonth: 1_720_000,
    estCreditsThisMonth: 19,
    estCreditsLastMonth: 17,
  },
];
function defaultHealthMetrics(): Pick<
  Connector,
  | 'avgSyncDurationSeconds'
  | 'rowsProcessedLastSync'
  | 'rowsInsertedLastSync'
  | 'rowsUpdatedLastSync'
  | 'rowsDeletedLastSync'
> {
  return {
    avgSyncDurationSeconds: 300,
    rowsProcessedLastSync: 0,
    rowsInsertedLastSync: 0,
    rowsUpdatedLastSync: 0,
    rowsDeletedLastSync: 0,
  };
}
export function listConnectors(): Connector[] {
  return [...demoConnectors];
}
export function getConnectorCount(): number {
  return demoConnectors.length;
}
export function getConnectorById(connectorId: string): Connector | undefined {
  return demoConnectors.find((c) => c.id === connectorId);
}
export function getConnectorStatus(connectorId: string) {
  const connector = demoConnectors.find((c) => c.id === connectorId);
  if (!connector) {
    return { found: false as const, connectorId };
  }
  const health =
    connector.status === 'active' ? 'green' : connector.status === 'warning' ? 'yellow' : 'red';
  return {
    found: true as const,
    connector,
    syncHealth: health,
    nextScheduledSync: connector.nextSyncAt,
  };
}
export function getConnectorLogs(connectorId: string, timeRangeHours = 24) {
  const cutoff = Date.now() - timeRangeHours * 60 * 60 * 1000;
  const logs = demoLogs
    .filter(
      (log) => log.connectorId === connectorId && new Date(log.timestamp).getTime() >= cutoff,
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { connectorId, timeRangeHours, count: logs.length, logs };
}
export function getConnectorHistory(connectorId: string): {
  connectorId: string;
  runs: SyncHistoryEntry[];
} {
  const profile = HISTORY_PROFILES[connectorId];
  if (!profile) {
    return { connectorId, runs: [] };
  }
  const runs: SyncHistoryEntry[] = [];
  let cursorMinutes = 30;
  for (let i = 0; i < 10; i++) {
    const durationSeconds = Math.round(
      profile.baseDuration + (Math.sin(i * 1.7) * profile.variance) / 2,
    );
    const roll = (i * 17 + connectorId.length) % 10;
    const status: SyncHistoryEntry['status'] =
      i === 0 && connectorId === 'conn_ga4_001'
        ? 'failed'
        : i === 0 && connectorId === 'conn_zendesk_001'
          ? 'partial'
          : roll / 10 < profile.successRate
            ? i === 3 && connectorId === 'conn_shopify_001'
              ? 'partial'
              : 'succeeded'
            : roll % 2 === 0
              ? 'partial'
              : 'failed';
    const finishedAt = mins(cursorMinutes);
    const startedAt = secsAgo(cursorMinutes * 60 + durationSeconds);
    const rowsProcessed =
      status === 'failed'
        ? 0
        : Math.round(profile.rowsBase * (0.85 + (i % 3) * 0.05));
    runs.push({
      startedAt,
      finishedAt,
      status,
      durationSeconds,
      rowsProcessed,
    });
    cursorMinutes += connectorId === 'conn_zendesk_001' ? 90 : connectorId === 'conn_marketo_001' ? 360 : 60;
  }
  return { connectorId, runs };
}
export function getSchemaChanges(connectorId: string): {
  connectorId: string;
  changes: SchemaChangeEvent[];
} {
  const changes = [...(SCHEMA_CHANGES[connectorId] ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return { connectorId, changes };
}
export function getUsageSummary(): { usage: ConnectorUsage[]; refreshedAt: string } {
  return {
    usage: [...USAGE_SUMMARY].sort((a, b) => b.marThisMonth - a.marThisMonth),
    refreshedAt: new Date().toISOString(),
  };
}
export function addConnector(input: AddConnectorInput): Connector {
  const now = new Date();
  const health = defaultHealthMetrics();
  const connector: Connector = {
    ...input,
    ...health,
    syncState: input.status === 'paused' ? 'paused' : 'scheduled',
    lastSyncStartedAt: now.toISOString(),
    lastSyncFinishedAt: now.toISOString(),
    lastSyncAt: now.toISOString(),
    nextSyncAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    lastSyncStatus: 'succeeded',
    schemaVersion: 'v1.0.0',
    status: input.status ?? 'active',
  };
  demoConnectors.push(connector);
  HISTORY_PROFILES[connector.id] = {
    baseDuration: 300,
    variance: 60,
    successRate: 0.95,
    rowsBase: 10_000,
  };
  demoLogs.unshift({
    timestamp: now.toISOString(),
    level: 'info',
    message: `Connector ${connector.id} created via AI-assisted setup`,
    connectorId: connector.id,
  });
  return connector;
}
export function triggerSync(connectorId: string) {
  const connector = demoConnectors.find((c) => c.id === connectorId);
  if (!connector) return { success: false, connectorId, message: 'Connector not found' };
  connector.status = 'syncing';
  connector.syncState = 'syncing';
  connector.lastSyncStatus = 'running';
  return {
    success: true,
    connectorId,
    syncId: `sync_${Date.now()}`,
    message: `Sync triggered for ${connector.name}`,
    estimatedDurationMinutes: 12,
  };
}
export function updateConnectorSchema(connectorId: string, schemaConfig: SchemaConfig) {
  const connector = demoConnectors.find((c) => c.id === connectorId);
  if (!connector) return { success: false, connectorId, message: 'Connector not found' };
  const now = new Date();
  connector.status = 'active';
  connector.syncState = 'scheduled';
  connector.lastSyncStatus = 'succeeded';
  connector.errorMessage = undefined;
  connector.schemaVersion = `v${(parseFloat(connector.schemaVersion.replace('v', '')) + 0.1).toFixed(1)}`;
  connector.lastSyncStartedAt = secsAgo(420);
  connector.lastSyncFinishedAt = now.toISOString();
  connector.lastSyncAt = now.toISOString();
  connector.nextSyncAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return {
    success: true,
    connectorId,
    schemaVersion: connector.schemaVersion,
    appliedConfig: schemaConfig,
    message: 'Schema updated successfully.',
  };
}
export function pauseConnector(connectorId: string) {
  const connector = demoConnectors.find((c) => c.id === connectorId);
  if (!connector) return { success: false, connectorId, message: 'Connector not found' };
  connector.status = 'paused';
  connector.syncState = 'paused';
  return { success: true, connectorId, status: connector.status };
}
export function resumeConnector(connectorId: string) {
  const connector = demoConnectors.find((c) => c.id === connectorId);
  if (!connector) return { success: false, connectorId, message: 'Connector not found' };
  connector.status = connector.lastSyncStatus === 'failed' ? 'failed' : 'active';
  connector.syncState = connector.status === 'failed' ? 'broken' : 'scheduled';
  return { success: true, connectorId, status: connector.status };
}

function scheduleToMinutes(schedule: string): number {
  const s = schedule.toLowerCase();
  if (s.includes('15 minute')) return 15;
  if (s.includes('30 minute')) return 30;
  if (s.includes('1 hour') || s === 'hourly') return 60;
  if (s.includes('6 hour')) return 360;
  if (s.includes('12 hour')) return 720;
  if (s.includes('daily') || s.includes('24 hour')) return 1440;
  return 60;
}

export function updateConnector(connectorId: string, updates: UpdateConnectorInput) {
  const connector = demoConnectors.find((c) => c.id === connectorId);
  if (!connector) return { success: false as const, connectorId, message: 'Connector not found' };

  if (updates.name?.trim()) {
    connector.name = updates.name.trim();
  }
  if (updates.schedule?.trim()) {
    connector.schedule = updates.schedule.trim();
    const intervalMin = scheduleToMinutes(connector.schedule);
    connector.nextSyncAt = new Date(Date.now() + intervalMin * 60 * 1000).toISOString();
  }

  demoLogs.unshift({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Connector ${connectorId} updated — schedule: ${connector.schedule}`,
    connectorId,
  });

  return { success: true as const, connector };
}
