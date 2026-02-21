
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
  segmen: z.string(),
  tanggal: z.string(),
  nominal: z.number(),
  userId: z.string(),
});

const SendTelegramReportInputSchema = z.object({
  rekapData: z.array(RekapDataItemSchema),
  grandTotal: z.number(),
  rekapDate: z.string(),
});

const SendTelegramReportOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendTelegramReportInput = z.infer<typeof SendTelegramReportInputSchema>;
export type SendTelegramReportOutput = z.infer<typeof SendTelegramReportOutputSchema>;

// Define the Telegram bot token and chat ID from environment variables
const TELEGRAM_BOT_TOKEN = '8043290500:AAGxBvwZvkyASJb3a_q8wEBiveyVE2NN9lY';
const TELEGRAM_CHAT_ID = '-4689716037'; 

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
      const errorMsg = 'Telegram Bot Token atau Chat ID untuk Keuangan belum dikonfigurasi.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

      // Format the message content
      let message = `Rekap Harian - ${input.rekapDate}\n${"=".repeat(20)}\n\n`;

      message += input.rekapData
        .map(item => {
            // Subtotal row
            if (item.name.startsWith('TOTAL ')) {
                 return `\n${item.name}: Rp ${item.nominal.toLocaleString('id-ID')}\n${'-'.repeat(20)}`;
            }
            // Individual item row
            return `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} Rp ${item.nominal.toLocaleString('id-ID')}`;
        })
        .join('\n');
        
      message += `\n\n${"=".repeat(20)}\nTotal: Rp ${input.grandTotal.toLocaleString('id-ID')}`;

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
