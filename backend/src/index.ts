import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import fivetranRoutes from './routes/fivetran.js';
import elasticRoutes from './routes/elastic.js';
import mongoRoutes from './routes/mongo.js';
import bigqueryRoutes from './routes/bigquery.js';
import chatRoutes from './routes/chat.js';
import intelligenceRoutes from './routes/intelligence.js';
import aiRoutes from './routes/ai.js';

const app = express();

app.use(
  cors({
    origin:
      config.NODE_ENV === 'development'
        ? true
        : config.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/fivetran', fivetranRoutes);
app.use('/api/elastic', elasticRoutes);
app.use('/api/mongo', mongoRoutes);
app.use('/api/bigquery', bigqueryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/ai', aiRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(config.PORT, () => {
  console.log(`AROA backend listening on http://localhost:${config.PORT}`);
  console.log(`Health: http://localhost:${config.PORT}/health`);
});
