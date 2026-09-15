import axios from 'axios'; import crypto from 'crypto'; import { config } from '../config/env'; import { logger } from '../config/logger';

export interface InhouseWebhookPayload { payloadId: string; ticketId: string; intent: string; confidence: number; summary: string; generatedResponse: string; inferenceTimeMs: number; timestamp: string; }

export class WebhookDispatcher { static async dispatchToInhouse(payload: InhouseWebhookPayload): Promise { const body = JSON.stringify(payload); const signature = crypto .createHmac('sha256', config.inhouse.webhookSecret) .update(body) .digest('hex');

try {
  const response = await axios.post(config.inhouse.webhookUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': `sha256=${signature}`,
    },
    timeout: 5000,
  });
  logger.info(`Dispatched AI results to in-house webhook`, { status: response.status });
  return true;
} catch (error: any) {
  logger.warn(`Failed to deliver webhook to in-house app (${config.inhouse.webhookUrl}): ${error.message}`);
  return false;
}
} } 