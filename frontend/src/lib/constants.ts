import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: 'AIzaSyDEMO_xxxxxxxxxxxxxxxxxxxx',
  agentId: 'agents/aroa-sre-agent-demo',
  fivetranApiKey: 'ft_demo_8k2mN9pQ7rT4vX1z',
  fivetranApiSecret: 'ft_secret_demo_W3xY9zA2bC5dE8fG',
  elasticCloudId: 'aroa-demo:ZXUtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJGRkZ...',
  elasticApiKey: 'VnBa_demo_elastic_api_key_xxxxxxxx',
  mongoUri: 'mongodb+srv://aroa-demo:demo_pass@cluster0.demo.mongodb.net',
  mongoDatabase: 'aroa_incidents',
  bigqueryProjectId: 'demo-analytics-prod',
  bigqueryDatasetId: 'analytics',
};

export const AUTH_STORAGE_KEY = 'aroa_auth';
