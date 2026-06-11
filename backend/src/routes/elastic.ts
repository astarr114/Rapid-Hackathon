import { Router } from 'express';
import * as elastic from '../services/elasticService.js';

const router = Router();

router.post('/search-logs', (req, res) => {
  const { query, index, timeRangeHours } = req.body as {
    query?: string;
    index?: string;
    timeRangeHours?: number;
  };
  res.json(elastic.searchLogs(query ?? '', index ?? 'pipeline-logs-*', timeRangeHours ?? 24));
});

router.post('/get-error-rate', (req, res) => {
  const { index, timeRangeHours } = req.body as {
    index?: string;
    timeRangeHours?: number;
  };
  res.json(elastic.getErrorRate(index ?? 'pipeline-logs-*', timeRangeHours ?? 24));
});

router.post('/find-correlated-errors', (req, res) => {
  const { connectorId, timeRangeHours } = req.body as {
    connectorId?: string;
    timeRangeHours?: number;
  };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(elastic.findCorrelatedErrors(connectorId, timeRangeHours ?? 24));
});

export default router;
