import { Router } from 'express';
import * as elastic from '../services/elasticService.js';

const router = Router();

function timeOpts(body: {
  timeRangeHours?: number;
  startTime?: string;
  endTime?: string;
}) {
  return {
    timeRangeHours: body.timeRangeHours,
    startTime: body.startTime,
    endTime: body.endTime,
  };
}

router.post('/search-logs', (req, res) => {
  const { query, index, timeRangeHours, startTime, endTime } = req.body as {
    query?: string;
    index?: string;
    timeRangeHours?: number;
    startTime?: string;
    endTime?: string;
  };
  res.json(
    elastic.searchLogs(query ?? '', index ?? 'pipeline-logs-*', timeOpts({ timeRangeHours, startTime, endTime })),
  );
});

router.post('/get-error-rate', (req, res) => {
  const { index, timeRangeHours, startTime, endTime } = req.body as {
    index?: string;
    timeRangeHours?: number;
    startTime?: string;
    endTime?: string;
  };
  res.json(
    elastic.getErrorRate(index ?? 'pipeline-logs-*', timeOpts({ timeRangeHours, startTime, endTime })),
  );
});

router.post('/find-correlated-errors', (req, res) => {
  const { connectorId, timeRangeHours, startTime, endTime } = req.body as {
    connectorId?: string;
    timeRangeHours?: number;
    startTime?: string;
    endTime?: string;
  };
  if (!connectorId) {
    res.status(400).json({ error: 'connectorId is required' });
    return;
  }
  res.json(
    elastic.findCorrelatedErrors(connectorId, timeOpts({ timeRangeHours, startTime, endTime })),
  );
});

export default router;
