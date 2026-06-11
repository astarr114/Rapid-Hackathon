export interface Connector {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: 'active' | 'failed' | 'paused' | 'warning' | 'syncing' | string;
  syncState?: string;
  schedule?: string;
  lastSyncAt: string;
  lastSyncStartedAt?: string;
  lastSyncFinishedAt?: string;
  nextSyncAt?: string;
  lastSyncStatus?: 'succeeded' | 'failed' | 'partial' | 'running' | string;
  avgSyncDurationSeconds?: number;
  rowsProcessedLastSync?: number;
  rowsInsertedLastSync?: number;
  rowsUpdatedLastSync?: number;
  rowsDeletedLastSync?: number;
  schemaVersion?: string;
  errorMessage?: string;
  primaryTable?: string;
  tables?: string[];
}

export interface SyncHistoryEntry {
  startedAt: string;
  finishedAt: string;
  status: 'succeeded' | 'failed' | 'partial';
  durationSeconds: number;
  rowsProcessed: number;
}

export interface SchemaChangeEvent {
  timestamp: string;
  eventType: 'create_table' | 'alter_table' | 'drop_table';
  objectType: 'table' | 'column';
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

export interface ImpactResult {
  upstream_table: string;
  downstream_views: string[];
  affectedDashboards?: string[];
  summary: string;
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

export interface ConnectorLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  connectorId: string;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  connectorId?: string;
  incidentType: string;
  rootCause?: string;
  recommendedActions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LogHit {
  timestamp: string;
  level: string;
  service: string;
  connectorId?: string;
  message: string;
  index: string;
}

export interface HourlyBucket {
  hour: number;
  label: string;
  events: number;
  errors: number;
}

export interface PlaybookStep {
  order: number;
  action: string;
  details: string;
}

export interface Playbook {
  incidentType: string;
  title: string;
  steps: PlaybookStep[];
}

export interface AppSettings {
  geminiApiKey: string;
  agentId: string;
  fivetranApiKey: string;
  fivetranApiSecret: string;
  elasticCloudId: string;
  elasticApiKey: string;
  mongoUri: string;
  mongoDatabase: string;
  bigqueryProjectId: string;
  bigqueryDatasetId: string;
}

export interface ToolTraceEntry {
  tool: string;
  endpoint: string;
  durationMs: number;
  status: 'ok' | 'warn' | 'error';
  summary: string;
}

export interface ReliabilityScanResult {
  score: number;
  grade: string;
  trend: 'declining' | 'stable' | 'improving';
  scannedAt: string;
  summary: string;
  findings: Array<{
    severity: string;
    category: string;
    message: string;
    suggestedAction?: string;
  }>;
  toolTrace: ToolTraceEntry[];
}

export interface SlaPrediction {
  table: string;
  currentFreshnessMinutes: number;
  status: string;
  breachProbability: number;
  riskLevel: string;
  predictedBreachInMinutes: number;
  recommendation: string;
}

export interface LineageNode {
  id: string;
  type: string;
  label: string;
  status: string;
  x: number;
  y: number;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: Array<{ from: string; to: string; label: string }>;
  blastRadius: {
    rootCause: string;
    affectedAssets: number;
    impactedDashboards: number;
    estimatedBusinessImpact: string;
  };
}

export interface LiveEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  message: string;
  source: string;
}

export interface RemediationStep {
  step: number;
  tool: string;
  endpoint: string;
  status: string;
  message: string;
  durationMs?: number;
}

export interface AgentGroundingSource {
  id: string;
  name: string;
  toolCount: number;
}

export interface AgentStatus {
  connected: boolean;
  mode: 'agent_builder' | 'demo';
  agentId: string;
  apiRevision: string;
  modelFamily: string;
  interactionsApi: string;
  sessionContinuity: boolean;
  toolCalling: boolean;
  groundingSourceCount: number;
  groundingSources: AgentGroundingSource[];
  capabilities: string[];
}

export interface AgentMeta {
  mode: 'live' | 'demo';
  interactionId?: string;
  agentId: string;
  apiRevision: string;
  modelFamily: string;
  groundingSources: AgentGroundingSource[];
  sessionContinuity: boolean;
}

export interface BriefingSection {
  title: string;
  body: string;
  citations: string[];
}

export interface ExecutiveBriefing {
  generatedAt: string;
  agentMode: string;
  headline: string;
  score: number;
  grade: string;
  trend: string;
  sections: BriefingSection[];
  groundedIn: string[];
  suggestedPrompts: string[];
  geminiNarrative?: string;
}
