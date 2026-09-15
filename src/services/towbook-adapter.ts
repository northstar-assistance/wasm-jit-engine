import axios from 'axios'; import { config } from '../config/env'; import { logger } from '../config/logger';

export interface TowbookUpdatePayload { ticketId: string; intent: string; summary: string; generatedResponse: string; }

export class TowbookAdapter { static async updateTicket(data: TowbookUpdatePayload): Promise { if (config.towbook.mockMode) { logger.info([MOCK TOWBOOK ADAPTER] Updated Ticket ${data.ticketId}:, { intent: data.intent, summary: data.summary, response: data.generatedResponse, }); return true; }

try {
  const response = await axios.post(
    `${config.towbook.apiUrl}/tickets/${data.ticketId}/notes`,
    {
      note: `[AI Classification]: ${data.intent}\n[Summary]: ${data.summary}\n[Dispatch Note]: ${data.generatedResponse}`,
    },
    {
      headers: {
        'Authorization': `Bearer ${config.towbook.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  logger.info(`Updated Towbook API for ticket ${data.ticketId}`, { status: response.status });
  return true;
} catch (error: any) {
  logger.error(`Failed to update Towbook API for ticket ${data.ticketId}:`, error.message);
  return false;
}
} } 