
#####$$$$#####$$$$#####

#####$$$$#####$$$$#####
13. src/routes/metrics.ts
#####$$$$#####$$$$#####
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const totalProcessed = await prisma.auditTrail.count({
      where: { status: 'PROCESSED' },
    });

    const failureCount = await prisma.auditTrail.count({
      where: { status: 'FAILED' },
    });

    const aggregateLatency = await prisma.auditTrail.aggregate({
      _avg: { inferenceTimeMs: true },
      where: { status: 'PROCESSED' },
    });

    const recentAudits = await prisma.auditTrail.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { webhookPayload: true },
    });

    return res.json({
      totalProcessed,
      failureCount,
      averageInferenceTimeMs: Math.round(aggregateLatency._avg.inferenceTimeMs || 0),
      recentAudits,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/intents', async (req: Request, res: Response) => {
  try {
    const intentDistribution = await prisma.auditTrail.groupBy({
      by: ['intentDetected'],
      _count: { id: true },
      where: { status: 'PROCESSED', intentDetected: { not: null } },
    });

    return res.json({ intentDistribution });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
#####$$$$#####$$$$#####
14. src/server.ts
#####$$$$#####$$$$#####
import express from 'express';
import { config } from './config/env';
import { logger } from './config/logger';
import webhooksRouter from './routes/webhooks';
import metricsRouter from './routes/metrics';
import { startWorker } from './queue/worker';
import { WasmAiEngine } from './wasm-ai';

const app = express();

app.use(express.json());

// Register API Routes
app.use('/api/webhooks', webhooksRouter);
app.use('/api/metrics', metricsRouter);

app.get('/', (req, res) => {
  res.json({
    service: 'Towbook WASM AI Pipeline',
    status: 'running',
    endpoints: {
      webhook: 'POST /api/webhooks/towbook',
      metrics: 'GET /api/metrics/summary',
      intents: 'GET /api/metrics/intents',
    },
  });
});

async function main() {
  logger.info('Pre-loading WASM AI Models...');
  await WasmAiEngine.init();

  logger.info('Starting BullMQ Queue Worker...');
  startWorker();

  app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port} (${config.nodeEnv})`);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
#####$$$$#####$$$$#####
15. .gitignore
#####$$$$#####$$$$#####
node_modules/
dist/
.env
*.log
coverage/
.prisma/
#####$$$$#####$$$$#####
16. SETUP.md
#####$$$$#####$$$$#####
# Towbook WASM AI Pipeline Setup Guide

This backend pipeline connects Towbook webhooks with an in-house app using local WASM AI model inference, BullMQ Redis queues, and Dockerized PostgreSQL.

## Quick Start

1. **Clone repo & switch branch:**
   ```bash
   git clone https://github.com/northstar-assistance/wasm-jit-engine.git
   cd wasm-jit-engine
   git checkout -b backend/ai-pipeline
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start Docker Services:**
   ```bash
   docker-compose up -d
   ```

4. **Initialize Database:**
   ```bash
   npm run db:migrate
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```

## Test Webhook Endpoint

Send a sample ticket payload via cURL:

```bash
curl -X POST http://localhost:3000/api/webhooks/towbook \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "CALL_CREATED",
    "ticketData": {
      "id": "TICKET-992",
      "description": "Vehicle stranded on highway",
      "notes": "Driver locked keys inside cab while changing flat tire."
    }
  }'
```

Check metrics at:
`http://localhost:3000/api/metrics/summary`