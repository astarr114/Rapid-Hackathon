import { Router } from 'express';
import * as agent from '../services/agentService.js';
import * as intelligence from '../services/intelligenceService.js';

const router = Router();

router.post('/reliability-scan', (_req, res) => {
  res.json(intelligence.runReliabilityScan());
});

router.get('/sla-predictions', (_req, res) => {
  res.json({ predictions: intelligence.predictSlaBreaches() });
});

router.get('/lineage-graph', (_req, res) => {
  res.json(intelligence.getLineageGraph());
});

router.post('/auto-remediate', (req, res) => {
  const { connectorId } = req.body as { connectorId?: string };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(intelligence.runAutoRemediate(connectorId));
});

router.get('/live-events', (req, res) => {
  const since = req.query.since as string | undefined;
  res.json(intelligence.getLiveEvents(since));
});

router.get('/agent-status', (_req, res) => {
  res.json(agent.getAgentStatus());
});

router.post('/ai-briefing', async (_req, res, next) => {
  try {
    const briefing = await agent.generateBriefingWithGemini();
    res.json(briefing);
  } catch (err) {
    next(err);
  }
});

export default router;
