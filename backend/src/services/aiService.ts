import { config } from '../config.js';
import type { ProposedConnector } from '../types/connectors.js';

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const KEYWORD_PATTERNS: Array<{
  match: RegExp;
  build: (description: string) => ProposedConnector;
}> = [
  {
    match: /shopify/i,
    build: (d) => ({
      id: `conn_shopify_${Date.now().toString(36).slice(-4)}`,
      name: 'Shopify → BigQuery (AI Generated)',
      source: 'Shopify',
      destination: 'BigQuery',
      schedule: d.match(/daily/i) ? 'every 24 hours' : 'every 15 minutes',
      tables: ['orders', 'order_items', 'customers', 'products'],
      notes: 'Configured from natural language prompt. Excludes test orders. Sandbox project recommended.',
    }),
  },
  {
    match: /zendesk|support|ticket/i,
    build: () => ({
      id: `conn_zendesk_${Date.now().toString(36).slice(-4)}`,
      name: 'Zendesk → BigQuery (Full History)',
      source: 'Zendesk',
      destination: 'BigQuery',
      schedule: 'every 30 minutes',
      tables: ['tickets', 'ticket_comments', 'users', 'organizations'],
      notes: 'Full historical backfill enabled. Includes SLA and CSAT custom fields.',
    }),
  },
  {
    match: /postgres|postgresql/i,
    build: () => ({
      id: `conn_postgres_${Date.now().toString(36).slice(-4)}`,
      name: 'PostgreSQL → BigQuery (CDC)',
      source: 'PostgreSQL',
      destination: 'BigQuery',
      schedule: 'every 15 minutes',
      tables: ['orders', 'inventory', 'customers'],
      notes: 'Change-data-capture via logical replication. Requires read replica.',
    }),
  },
  {
    match: /salesforce|crm/i,
    build: () => ({
      id: `conn_salesforce_${Date.now().toString(36).slice(-4)}`,
      name: 'Salesforce → BigQuery',
      source: 'Salesforce',
      destination: 'BigQuery',
      schedule: 'every 30 minutes',
      tables: ['accounts', 'opportunities', 'contacts', 'leads'],
      notes: 'Standard objects synced. Custom objects can be added post-setup.',
    }),
  },
  {
    match: /ga4|analytics|google analytics/i,
    build: () => ({
      id: `conn_ga4_${Date.now().toString(36).slice(-4)}`,
      name: 'GA4 → BigQuery',
      source: 'Google Analytics 4',
      destination: 'BigQuery',
      schedule: 'every 1 hour',
      tables: ['events_daily', 'events_intraday', 'user_properties'],
      notes: 'Includes event_params flattening. Schema auto-update recommended.',
    }),
  },
  {
    match: /marketo|marketing/i,
    build: () => ({
      id: `conn_marketo_${Date.now().toString(36).slice(-4)}`,
      name: 'Marketo → BigQuery',
      source: 'Marketo',
      destination: 'BigQuery',
      schedule: 'every 6 hours',
      tables: ['leads', 'campaigns', 'activities', 'programs'],
      notes: 'Lead activity and campaign attribution tables included.',
    }),
  },
];

function fallbackProposal(description: string): ProposedConnector {
  const slug = description.slice(0, 30).replace(/\W+/g, '_').toLowerCase() || 'custom';
  return {
    id: `conn_${slug}_${Date.now().toString(36).slice(-4)}`,
    name: `Custom Pipeline → BigQuery`,
    source: 'Custom API',
    destination: 'BigQuery',
    schedule: 'every 1 hour',
    tables: ['raw_events', 'processed_events'],
    notes: `AI-generated config from: "${description.slice(0, 120)}"`,
  };
}

function parseGeminiJson(text: string): ProposedConnector | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as ProposedConnector;
    if (parsed.id && parsed.name && parsed.source) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function callGeminiForProposal(description: string): Promise<ProposedConnector | null> {
  if (
    config.GEMINI_API_KEY === 'your_gemini_api_key' ||
    !config.GEMINI_API_KEY
  ) {
    return null;
  }

  const systemPrompt = `You are a data pipeline architect. Given a user's connector description, return ONLY valid JSON (no markdown) matching this schema:
{
  "id": "conn_<source>_<shortid>",
  "name": "<Source> → BigQuery (<context>)",
  "source": "<source system>",
  "destination": "BigQuery",
  "schedule": "<cron-like string e.g. every 15 minutes>",
  "tables": ["table1", "table2"],
  "notes": "<setup notes>"
}`;

  const body = {
    model: 'gemini-2.0-flash',
    input: `${systemPrompt}\n\nUser request: ${description}`,
  };

  try {
    const resp = await fetch(INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.GEMINI_API_KEY,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify(body),
    });

    const data = (await resp.json()) as {
      output_text?: string;
      steps?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text =
      data.output_text ??
      data.steps?.flatMap((s) => s.content?.map((c) => c.text).filter(Boolean) ?? []).join('') ??
      '';
    return parseGeminiJson(text);
  } catch {
    return null;
  }
}

function keywordProposal(description: string): ProposedConnector {
  for (const { match, build } of KEYWORD_PATTERNS) {
    if (match.test(description)) return build(description);
  }
  return fallbackProposal(description);
}

export async function proposeConnector(description: string) {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error('description is required');
  }

  // TODO: In production, always use Gemini with structured output / function calling
  const fromGemini = await callGeminiForProposal(trimmed);
  const proposal = fromGemini ?? keywordProposal(trimmed);
  const source: 'gemini' | 'keyword_fallback' = fromGemini ? 'gemini' : 'keyword_fallback';

  return {
    proposal,
    source,
    generatedAt: new Date().toISOString(),
  };
}
