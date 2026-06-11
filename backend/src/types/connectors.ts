export type ConnectorStatus = 'active' | 'failed' | 'paused' | 'warning' | 'syncing';

export type LastSyncStatus = 'succeeded' | 'failed' | 'partial' | 'running';

export interface Connector {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: ConnectorStatus;
  syncState: 'scheduled' | 'syncing' | 'paused' | 'broken' | 'degraded';
  schedule: string;
  /** @deprecated Use lastSyncFinishedAt */
  lastSyncAt: string;
  lastSyncStartedAt: string;
  lastSyncFinishedAt: string;
  nextSyncAt: string;
  lastSyncStatus: LastSyncStatus;
  avgSyncDurationSeconds: number;
  rowsProcessedLastSync: number;
  rowsInsertedLastSync: number;
  rowsUpdatedLastSync: number;
  rowsDeletedLastSync: number;
  schemaVersion: string;
  errorMessage?: string;
  primaryTable?: string;
  tables?: string[];
}

export interface ConnectorLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  connectorId: string;
}

export interface SyncHistoryEntry {
  startedAt: string;
  finishedAt: string;
  status: 'succeeded' | 'failed' | 'partial';
  durationSeconds: number;
  rowsProcessed: number;
}

export type SchemaChangeEventType = 'create_table' | 'alter_table' | 'drop_table';
export type SchemaObjectType = 'table' | 'column';

export interface SchemaChangeEvent {
  timestamp: string;
  eventType: SchemaChangeEventType;
  objectType: SchemaObjectType;
  tableName: string;
  columnName?: string;
  details: string;
}

export interface ConnectorUsage {
  connectorId: string;
  connectorName: string;
  marThisMonth: number;
  marLastMonth: number;
  estCreditsThisMonth: number;
  estCreditsLastMonth: number;
}

export interface SchemaConfig {
  tables?: string[];
  columns?: Record<string, string[]>;
  mode?: 'append' | 'merge' | 'replace';
}

export interface ProposedConnector {
  id: string;
  name: string;
  source: string;
  destination: string;
  schedule: string;
  tables: string[];
  notes: string;
}

export interface UpdateConnectorInput {
  name?: string;
  schedule?: string;
}

export const SCHEDULE_PRESETS = [
  'every 15 minutes',
  'every 30 minutes',
  'every 1 hour',
  'every 6 hours',
  'every 12 hours',
  'daily',
] as const;

export type AddConnectorInput = Omit<
  Connector,
  | 'lastSyncAt'
  | 'lastSyncStartedAt'
  | 'lastSyncFinishedAt'
  | 'nextSyncAt'
  | 'lastSyncStatus'
  | 'avgSyncDurationSeconds'
  | 'rowsProcessedLastSync'
  | 'rowsInsertedLastSync'
  | 'rowsUpdatedLastSync'
  | 'rowsDeletedLastSync'
  | 'schemaVersion'
  | 'syncState'
> & {
  schedule: string;
  tables?: string[];
};
