'use server';

/**
 * @fileOverview This file defines a Genkit flow for sending a formatted report to a Telegram bot.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';
import { format } from 'date-fns';

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
// IMPORTANT: Replace this with your actual, personal Telegram Chat ID.
const TELEGRAM_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID_HERE'; 

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
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID_HERE') {
      const errorMsg = 'Telegram Bot Token atau Chat ID belum dikonfigurasi dengan benar.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

      // Format the message content
      let message = `Rekap Harian - ${format(new Date(), 'dd MMMM yyyy')}\n${"=".repeat(20)}\n\n`;

      message += input.rekapData
        .map(item => {
            // Replace the separator for better formatting in Telegram
            return `${item.phone} ${item.name} - ${item.details.replace(' | ', '\n  ')}`;
        })
        .join('\n\n');
        
      message += `\n\n${"=".repeat(20)}\nGrand Total: Rp ${input.grandTotal.toLocaleString('id-ID')}`;

      // Send the message
      await bot.sendMessage(TELEGRAM_CHAT_ID, message);

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram message:', error);
      const errorMessage = error.response?.body?.description || error.message || 'Terjadi kesalahan saat mengirim pesan ke Telegram.';
      // Provide a more specific error if the chat ID is invalid
      if (errorMessage.includes('chat not found')) {
          return { success: false, error: `Gagal mengirim: Chat ID "${TELEGRAM_CHAT_ID}" tidak valid atau bot belum diizinkan. Mohon periksa kembali Chat ID Anda.`}
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);
