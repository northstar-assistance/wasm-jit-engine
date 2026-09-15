import { Worker, Job } from 'bullmq'; import { PrismaClient } from '@prisma/client'; import { config } from '../config/env'; import { logger } from '../config/logger'; import { WasmAiEngine } from '../wasm-ai'; import { TowbookAdapter } from '../services/towbook-adapter'; import { WebhookDispatcher } from '../services/webhook-dispatcher';

const prisma = new PrismaClient();

export function startWorker() { const worker = new Worker( 'towbook-jobs', async (job: Job) => { const { payloadId, ticketData } = job.data; logger.info(Starting WASM AI job ${job.id} for payload ${payloadId}); const startTime = Date.now();

  const notesText = ticketData.notes || ticketData.description || '';
  const ticketId = ticketData.id || 'unknown';

  try {
    // 1. WASM AI Inference
    const intentResult = await WasmAiEngine.classifyTowIntent(notesText);
    const summary = await WasmAiEngine.summarizeNote(notesText);
    const generatedResponse = await WasmAiEngine.generateResponse(notesText, intentResult.topIntent);
    const inferenceTimeMs = Date.now() - startTime;

    // 2. Persist Audit Trail
    await prisma.auditTrail.create({
      data: {
        webhookPayloadId: payloadId,
        intentDetected: intentResult.topIntent,
        confidence: intentResult.confidence,
        generatedSummary: summary,
        generatedResponse,
        inferenceTimeMs,
        wasmModelUsed: 'ONNX-WASM-Transformers',
        status: 'PROCESSED',
      },
    });

    // 3. Mark Payload Processed
    await prisma.webhookPayload.update({
      where: { id: payloadId },
      data: { processed: true },
    });

    // 4. Update Towbook API Adapter
    await TowbookAdapter.updateTicket({
      ticketId,
      intent: intentResult.topIntent,
      summary,
      generatedResponse,
    });

    // 5. Dispatch Webhook to In-house Application
    await WebhookDispatcher.dispatchToInhouse({
      payloadId,
      ticketId,
      intent: intentResult.topIntent,
      confidence: intentResult.confidence,
      summary,
      generatedResponse,
      inferenceTimeMs,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Completed job ${job.id} in ${inferenceTimeMs}ms`);
  } catch (err: any) {
    logger.error(`Job ${job.id} failed:`, err);
    await prisma.auditTrail.create({
      data: {
        webhookPayloadId: payloadId,
        status: 'FAILED',
        inferenceTimeMs: Date.now() - startTime,
      },
    });
    throw err;
  }
},
{
  connection: {
    host: config.redis.host,
    port: config.redis.port,
  },
}
);

worker.on('failed', (job, err) => { logger.error(BullMQ worker error on job ${job?.id}:, err); });

return worker; } 