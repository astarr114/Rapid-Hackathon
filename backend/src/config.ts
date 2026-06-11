import dotenv from 'dotenv';
import { z } from 'zod';

// TODO: In production, accept integration settings from a secure config service
// (e.g. Secret Manager) rather than frontend Settings UI. The frontend SettingsContext
// is demo-only; wire FIVETRAN_*, ELASTIC_*, MONGO_*, BIGQUERY_* env vars here when
// swapping demo services for real API clients.

dotenv.config();

function defaultFrontendOrigin(): string {
  if (process.env.FRONTEND_ORIGIN) return process.env.FRONTEND_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  AGENT_ID: z.string().min(1, 'AGENT_ID is required'),
  FRONTEND_ORIGIN: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  // Allow startup in dev with placeholder values for dashboard-only demo
  console.warn('Using placeholder config — set GEMINI_API_KEY and AGENT_ID in .env for chat.');
}

const baseConfig = parsed.success
  ? parsed.data
  : {
      PORT: Number(process.env.PORT) || 3001,
      NODE_ENV: (process.env.NODE_ENV as 'development') || 'development',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'your_gemini_api_key',
      AGENT_ID: process.env.AGENT_ID || 'agents/YOUR_AGENT_ID',
      FRONTEND_ORIGIN: undefined as string | undefined,
      VERCEL_URL: process.env.VERCEL_URL,
    };

export const config = {
  ...baseConfig,
  FRONTEND_ORIGIN: baseConfig.FRONTEND_ORIGIN ?? defaultFrontendOrigin(),
  VERCEL_URL: baseConfig.VERCEL_URL ? `https://${baseConfig.VERCEL_URL}` : undefined,
};
