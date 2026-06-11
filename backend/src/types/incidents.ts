export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved';

export interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  connectorId?: string;
  incidentType: string;
  rootCause?: string;
  recommendedActions?: string[];
  createdAt: string;
  updatedAt: string;
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

export interface CreateIncidentPayload {
  title: string;
  summary: string;
  severity: IncidentSeverity;
  connectorId?: string;
  incidentType: string;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  connectorId?: string;
}
