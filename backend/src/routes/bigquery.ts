import { Router } from 'express';
import * as bigquery from '../services/bigqueryService.js';

const router = Router();

router.post('/check-freshness', (req, res) => {
  const { tables } = req.body as { tables?: string[] };
  if (!tables?.length) {
    res.status(400).json({ error: 'tables array is required' });
    return;
  }
  res.json(bigquery.checkFreshness(tables));
});

router.post('/check-impact', (req, res) => {
  const { project_id, dataset_id, table_id, primaryTable } = req.body as {
    project_id?: string;
    dataset_id?: string;
    table_id?: string;
    primaryTable?: string;
  };

  if (primaryTable) {
    res.json(bigquery.checkImpactForConnectorTable(primaryTable));
    return;
  }

  if (!project_id || !dataset_id || !table_id) {
    res.status(400).json({ error: 'project_id, dataset_id, and table_id are required (or primaryTable)' });
    return;
  }
  res.json(bigquery.checkImpact(project_id, dataset_id, table_id));
});

export default router;
