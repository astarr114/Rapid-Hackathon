import { Router } from 'express';
import * as mongo from '../services/mongoService.js';
import type { IncidentFilters } from '../types/incidents.js';

const router = Router();

router.post('/create-incident', (req, res) => {
  const { title, summary, severity, connectorId, incidentType } = req.body as {
    title?: string;
    summary?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    connectorId?: string;
    incidentType?: string;
  };

  if (!title || !summary || !severity || !incidentType) {
    res.status(400).json({ error: 'title, summary, severity, and incidentType are required' });
    return;
  }

  res.status(201).json(
    mongo.createIncident({ title, summary, severity, connectorId, incidentType }),
  );
});

router.get('/list-incidents', (req, res) => {
  const filters: IncidentFilters = {};
  if (req.query.status) filters.status = req.query.status as IncidentFilters['status'];
  if (req.query.severity) filters.severity = req.query.severity as IncidentFilters['severity'];
  if (req.query.connectorId) filters.connectorId = String(req.query.connectorId);
  res.json({ incidents: mongo.listIncidents(filters) });
});

router.put('/update-incident/:id', (req, res) => {
  const result = mongo.updateIncident(req.params.id, req.body);
  if (!result.success) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

router.post('/get-playbook', (req, res) => {
  const { incidentType } = req.body as { incidentType?: string };
  if (!incidentType) {
    res.status(400).json({ error: 'incidentType is required' });
    return;
  }
  res.json({ playbook: mongo.getPlaybook(incidentType) });
});

export default router;
