import { Router } from 'express';
import { proposeConnector } from '../services/aiService.js';

const router = Router();

router.post('/propose-connector', async (req, res, next) => {
  try {
    const { description } = req.body as { description?: string };
    if (!description?.trim()) {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    const result = await proposeConnector(description.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
