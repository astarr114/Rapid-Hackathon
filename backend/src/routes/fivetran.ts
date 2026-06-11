import { Router } from 'express';
import * as fivetran from '../services/fivetranService.js';

const router = Router();

router.post('/list-connectors', (_req, res) => {
  res.json({ connectors: fivetran.listConnectors() });
});

router.post('/get-connector-status', (req, res) => {
  const { connectorId } = req.body as { connectorId?: string };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.getConnectorStatus(connectorId));
});

router.post('/get-connector-history', (req, res) => {
  const { connectorId } = req.body as { connectorId?: string };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.getConnectorHistory(connectorId));
});

router.post('/get-schema-changes', (req, res) => {
  const { connectorId } = req.body as { connectorId?: string };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.getSchemaChanges(connectorId));
});

router.get('/usage-summary', (_req, res) => {
  res.json(fivetran.getUsageSummary());
});

router.post('/get-connector-logs', (req, res) => {
  const { connectorId, timeRangeHours } = req.body as {
    connectorId?: string;
    timeRangeHours?: number;
  };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.getConnectorLogs(connectorId, timeRangeHours ?? 24));
});

router.post('/trigger-sync', (req, res) => {
  const { connectorId } = req.body as { connectorId?: string };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.triggerSync(connectorId));
});

router.post('/update-connector-schema', (req, res) => {
  const { connectorId, schemaConfig } = req.body as {
    connectorId?: string;
    schemaConfig?: Record<string, unknown>;
  };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.updateConnectorSchema(connectorId, schemaConfig ?? {}));
});

router.post('/pause-connector', (req, res) => {
  const { connectorId } = req.body as { connectorId?: string };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.pauseConnector(connectorId));
});

router.post('/resume-connector', (req, res) => {
  const { connectorId } = req.body as { connectorId?: string };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(fivetran.resumeConnector(connectorId));
});

router.post('/add-connector', (req, res) => {
  const body = req.body as {
    id?: string;
    name?: string;
    source?: string;
    destination?: string;
    schedule?: string;
    tables?: string[];
    notes?: string;
    status?: 'active' | 'paused';
  };

  if (!body.id || !body.name || !body.source) {
    res.status(400).json({ error: 'id, name, and source are required' });
    return;
  }

  const connector = fivetran.addConnector({
    id: body.id,
    name: body.name,
    source: body.source,
    destination: body.destination ?? 'BigQuery',
    status: body.status ?? 'active',
    schedule: body.schedule ?? 'every 1 hour',
    tables: body.tables,
    primaryTable: body.tables?.[0]
      ? `demo-analytics-prod.${body.source.toLowerCase().replace(/\s+/g, '_')}.${body.tables[0]}`
      : undefined,
  });

  res.status(201).json({ success: true, connector });
});

export default router;
