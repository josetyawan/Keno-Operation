'use server';

/**
 * @fileOverview This file defines a Genkit flow for sending a formatted report to a Telegram bot.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import TelegramBot from 'node-telegram-bot-api';

// Define Zod schemas for input and output
const RekapDataItemSchema = z.object({
  phone: z.string(),
  name: z.string(),
  total: z.number(),
  details: z.string(),
});

const SendTelegramReportInputSchema = z.object({
  rekapData: z.array(RekapDataItemSchema),
  grandTotal: z.number(),
});

const SendTelegramReportOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendTelegramReportInput = z.infer<typeof SendTelegramReportInputSchema>;
export type SendTelegramReportOutput = z.infer<typeof SendTelegramReportOutputSchema>;

// Define the Telegram bot token and chat ID from environment variables
const TELEGRAM_BOT_TOKEN = '7858540741:AAHJS7OqRtGoj3YbgtN3JJ0HYTC99GQi3uQ';
const TELEGRAM_CHAT_ID = '7858540741'; // You can also get this dynamically if needed

// Main exported function that wraps the Genkit flow
export async function sendTelegramReport(input: SendTelegramReportInput): Promise<SendTelegramReportOutput> {
  return sendTelegramReportFlow(input);
}

// The Genkit flow definition
const sendTelegramReportFlow = ai.defineFlow(
  {
    name: 'sendTelegramReportFlow',
    inputSchema: SendTelegramReportInputSchema,
    outputSchema: SendTelegramReportOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

      // Format the message content
      let message = input.rekapData
        .map(item => `${item.phone} ${item.name} - ${item.details}`)
        .join('\n\n');
        
      // Add totals (example, adjust as needed)
      // This is a simplified example; your logic for "om lut, talangan + kas" might be more complex
      message += `\n\nTotal : ${input.grandTotal.toLocaleString('id-ID')}`;

      // Send the message
      await bot.sendMessage(TELEGRAM_CHAT_ID, message);

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram message:', error);
      return {
        success: false,
        error: error.response?.body?.description || error.message || 'An unknown error occurred while sending the message.',
      };
    }
  }
);
