import { config } from '../config.js';
import * as fivetran from './fivetranService.js';
import * as mongo from './mongoService.js';
import { runReliabilityScan, getLineageGraph } from './intelligenceService.js';

export const GROUNDING_SOURCES = [
  {
    id: 'fivetran',
    name: 'Fivetran Control Plane',
    tools: ['list_connectors', 'get_connector_history', 'get_schema_changes', 'usage_summary'],
    endpointPrefix: '/api/fivetran',
  },
  {
    id: 'elastic',
    name: 'Elastic Observability',
    tools: ['search_logs', 'get_error_rate', 'find_correlated_errors'],
    endpointPrefix: '/api/elastic',
  },
  {
    id: 'mongo',
    name: 'Incident Management',
    tools: ['list_incidents', 'create_incident', 'get_playbook'],
    endpointPrefix: '/api/mongo',
  },
  {
    id: 'bigquery',
    name: 'BigQuery Lineage & Freshness',
    tools: ['check_freshness', 'check_impact'],
    endpointPrefix: '/api/bigquery',
  },
  {
    id: 'intelligence',
    name: 'AROA Intelligence Engine',
    tools: ['reliability_scan', 'sla_predictions', 'lineage_graph', 'auto_remediate'],
    endpointPrefix: '/api/intelligence',
  },
] as const;

export function getAgentStatus() {
  const live =
    config.GEMINI_API_KEY !== 'your_gemini_api_key' &&
    config.AGENT_ID !== 'agents/YOUR_AGENT_ID';

  return {
    connected: live,
    mode: live ? 'agent_builder' : 'demo',
    agentId: maskAgentId(config.AGENT_ID),
    apiRevision: '2026-05-20',
    modelFamily: 'Gemini 2.5',
    interactionsApi: 'generativelanguage.googleapis.com/v1beta/interactions',
    sessionContinuity: true,
    toolCalling: true,
    groundingSourceCount: GROUNDING_SOURCES.length,
    groundingSources: GROUNDING_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      toolCount: s.tools.length,
    })),
    capabilities: [
      'Multi-turn session memory (previous_interaction_id)',
      'Autonomous tool orchestration',
      'Grounded reliability & pipeline context',
      'Schema drift + blast radius reasoning',
      'Cost-aware MAR recommendations',
      'Executive briefing synthesis',
    ],
  };
}

function maskAgentId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 10)}…${id.slice(-4)}`;
}

export function generateExecutiveBriefing() {
  const scan = runReliabilityScan();
  const lineage = getLineageGraph();
  const connectors = fivetran.listConnectors();
  const usage = fivetran.getUsageSummary();
  const incidents = mongo.listIncidents().filter((i) => i.status !== 'resolved');
  const failed = connectors.filter((c) => c.status === 'failed');
  const topMar = usage.usage[0];

  const criticalFindings = scan.findings.filter((f) => f.severity === 'critical').slice(0, 3);
  const headline =
    scan.score < 60
      ? 'Critical reliability posture — immediate intervention required'
      : scan.score < 80
        ? 'Elevated risk — targeted remediation recommended'
        : 'Platform stable with isolated degradation';

  const sections = [
    {
      title: 'Situation',
      body: `Composite reliability score is ${scan.score}/100 (${scan.grade}). ${scan.summary}`,
      citations: ['reliability_scan', 'list_connectors'],
    },
    {
      title: 'Blast radius',
      body: `${lineage.blastRadius.rootCause} affects ${lineage.blastRadius.affectedAssets} downstream assets and ${lineage.blastRadius.impactedDashboards} executive dashboards. ${lineage.blastRadius.estimatedBusinessImpact}.`,
      citations: ['lineage_graph', 'check_impact'],
    },
    {
      title: 'Active incidents',
      body:
        incidents.length === 0
          ? 'No open incidents.'
          : `${incidents.length} active incident(s): ${incidents.map((i) => i.title).join('; ')}.`,
      citations: ['list_incidents'],
    },
    {
      title: 'Cost & efficiency',
      body: `Highest MAR connector: ${topMar.connectorName} (${(topMar.marThisMonth / 1_000_000).toFixed(1)}M rows/mo, ${topMar.estCreditsThisMonth} est. credits). ${failed.length > 0 ? 'Failed pipelines still incur sync overhead — prioritize schema reconciliation.' : 'Usage within expected bounds.'}`,
      citations: ['usage_summary'],
    },
    {
      title: 'Recommended actions',
      body: criticalFindings.length
        ? criticalFindings.map((f) => f.suggestedAction ?? f.message).join(' · ')
        : 'Continue monitoring SLA predictions and error rate trends.',
      citations: ['reliability_scan', 'sla_predictions'],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    agentMode: getAgentStatus().mode,
    headline,
    score: scan.score,
    grade: scan.grade,
    trend: scan.trend,
    sections,
    groundedIn: GROUNDING_SOURCES.map((s) => s.name),
    suggestedPrompts: [
      'Summarize blast radius for GA4 and list impacted dashboards',
      'Which connectors should we de-prioritize based on MAR vs downstream usage?',
      'Draft an incident update for the executive team',
      'Run autonomous remediation plan for conn_ga4_001',
    ],
  };
}

export async function generateBriefingWithGemini(): Promise<
  ReturnType<typeof generateExecutiveBriefing> & { geminiNarrative?: string }
> {
  const briefing = generateExecutiveBriefing();
  const live = getAgentStatus().connected;

  if (!live) {
    return briefing;
  }

  try {
    const prompt = `You are an enterprise SRE copilot. Produce a concise executive briefing (3 short paragraphs) based on:\nScore: ${briefing.score}/100\nHeadline: ${briefing.headline}\nFindings: ${briefing.sections.map((s) => s.title + ': ' + s.body).join('\n')}`;

    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.GEMINI_API_KEY,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify({
        agent: config.AGENT_ID,
        input: prompt,
      }),
    });

    if (resp.ok) {
      const data = (await resp.json()) as { output_text?: string };
      if (data.output_text) {
        return {
          ...briefing,
          geminiNarrative: data.output_text,
        };
      }
    }
  } catch {
    /* fall back to structured briefing */
  }

  return briefing;
}
