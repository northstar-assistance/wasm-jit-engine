import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';
import { logger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();
const dispatchQueue = new Queue('towbook-jobs', {
  connection: { host: config.redis.host, port: config.redis.port },
});

router.post('/towbook', async (req: Request, res: Response) => {
  try {
    const { eventType, ticketData } = req.body;

    if (!ticketData) {
      return res.status(400).json({ error: 'Missing ticketData in payload' });
    }

    const payloadRecord = await prisma.webhookPayload.create({
      data: {
        source: 'towbook',
        eventType: eventType || 'CALL_CREATED',
        rawPayload: ticketData,
      },
    });

    const job = await dispatchQueue.add('process-ticket', {
      payloadId: payloadRecord.id,
      ticketData,
    });

    logger.info(`Ingested webhook ${payloadRecord.id}, queued job ${job.id}`);

    return res.status(202).json({
      status: 'ACKNOWLEDGED',
      payloadId: payloadRecord.id,
      jobId: job.id,
    });
  } catch (error: any) {
    logger.error('Error handling Towbook webhook:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;