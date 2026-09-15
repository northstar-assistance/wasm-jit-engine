import express from 'express'; import { config } from './config/env'; import { logger } from './config/logger'; import webhooksRouter from './routes/webhooks'; import metricsRouter from './routes/metrics'; import { startWorker } from './queue/worker'; import { WasmAiEngine } from './wasm-ai';

const app = express();

app.use(express.json());

// Register API Routes app.use('/api/webhooks', webhooksRouter); app.use('/api/metrics', metricsRouter);

app.get('/', (req, res) => { res.json({ service: 'Towbook WASM AI Pipeline', status: 'running', endpoints: { webhook: 'POST /api/webhooks/towbook', metrics: 'GET /api/metrics/summary', intents: 'GET /api/metrics/intents', }, }); });

async function main() { logger.info('Pre-loading WASM AI Models...'); await WasmAiEngine.init();

logger.info('Starting BullMQ Queue Worker...'); startWorker();

app.listen(config.port, () => { logger.info(Server listening on port ${config.port} (${config.nodeEnv})); }); }

main().catch((err) => { logger.error('Fatal startup error:', err); process.exit(1); });