import { config } from './config.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`AROA backend listening on http://localhost:${config.PORT}`);
  console.log(`Health: http://localhost:${config.PORT}/health`);
});
