import { Router } from 'express';
import { chatWithAgent } from '../services/geminiService.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body as { message?: string; sessionId?: string };

    if (!message?.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const { reply, interactionId, toolTrace, agentMeta } = await chatWithAgent(
      message.trim(),
      sessionId,
    );
    res.json({ reply, sessionId: interactionId, toolTrace, agentMeta });
  } catch (err) {
    next(err);
  }
});

export default router;
