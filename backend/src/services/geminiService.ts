import { config } from '../config.js';
import { getAgentStatus } from './agentService.js';
import { inferToolTrace } from './intelligenceService.js';

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

interface InteractionResponse {
  id?: string;
  output_text?: string;
  status?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
}

function buildAgentMeta(interactionId?: string, mode: 'live' | 'demo' = 'demo') {
  const status = getAgentStatus();
  return {
    mode,
    interactionId,
    agentId: status.agentId,
    apiRevision: status.apiRevision,
    modelFamily: status.modelFamily,
    groundingSources: status.groundingSources,
    sessionContinuity: status.sessionContinuity,
  };
}

function extractReply(data: InteractionResponse): string {
  if (data.output_text) {
    return data.output_text;
  }

  if (data.steps?.length) {
    const texts: string[] = [];
    for (const step of data.steps) {
      if (step.type === 'model_output' && step.content) {
        for (const part of step.content) {
          if (part.type === 'text' && part.text) {
            texts.push(part.text);
          }
        }
      }
    }
    if (texts.length) {
      return texts.join('\n\n');
    }
  }

  return 'No response text received from agent.';
}

export async function chatWithAgent(message: string, sessionId?: string) {
  // TODO: Ensure GEMINI_API_KEY and AGENT_ID are set to real values in .env
  if (
    config.GEMINI_API_KEY === 'your_gemini_api_key' ||
    config.AGENT_ID === 'agents/YOUR_AGENT_ID'
  ) {
    return {
      reply:
        '⚠️ Demo mode: Set GEMINI_API_KEY and AGENT_ID in backend/.env to connect to your Agent Builder agent.\n\n' +
        'Meanwhile, here is what I would investigate:\n' +
        '• GA4 connector (conn_ga4_001) is FAILED — schema drift on custom_dimension_12\n' +
        '• analytics.ga4_events_daily freshness is CRITICAL (300 min late)\n' +
        '• GA4 has the highest MAR (~48M rows/mo) — consider lowering sync frequency if downstream usage is low\n' +
        '• Impacted views: demo-analytics-prod.analytics.sales_dashboard, marketing_funnel\n' +
        '• Recommend: get_schema_changes → check_impact → update_connector_schema → trigger_sync',
      interactionId: sessionId ?? `demo_${Date.now()}`,
      toolTrace: inferToolTrace(message),
      agentMeta: buildAgentMeta(sessionId, 'demo'),
    };
  }

  const body: Record<string, unknown> = {
    agent: config.AGENT_ID,
    input: message,
  };

  if (sessionId) {
    body.previous_interaction_id = sessionId;
  }

  const resp = await fetch(INTERACTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.GEMINI_API_KEY,
      'Api-Revision': '2026-05-20',
    },
    body: JSON.stringify(body),
  });

  const data = (await resp.json()) as InteractionResponse & { error?: { message?: string } };

  if (!resp.ok) {
    const errMsg = data.error?.message ?? `Gemini API error (${resp.status})`;
    throw new Error(errMsg);
  }

  return {
    reply: extractReply(data),
    interactionId: data.id,
    toolTrace: inferToolTrace(message),
    agentMeta: buildAgentMeta(data.id, 'live'),
  };
}

export { inferToolTrace };
