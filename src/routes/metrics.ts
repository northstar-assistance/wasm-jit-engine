import { Router, Request, Response } from 'express'; import { PrismaClient } from '@prisma/client';

const router = Router(); const prisma = new PrismaClient();

router.get('/summary', async (req: Request, res: Response) => { try { const totalProcessed = await prisma.auditTrail.count({ where: { status: 'PROCESSED' }, });

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
} catch (error: any) { return res.status(500).json({ error: error.message }); } });

router.get('/intents', async (req: Request, res: Response) => { try { const intentDistribution = await prisma.auditTrail.groupBy({ by: ['intentDetected'], _count: { id: true }, where: { status: 'PROCESSED', intentDetected: { not: null } }, });

return res.json({ intentDistribution });
} catch (error: any) { return res.status(500).json({ error: error.message }); } });

export default router;