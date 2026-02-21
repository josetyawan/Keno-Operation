
'use server';

/**
 * @fileOverview This file defines a Genkit flow for sending a rejection notification to a Telegram group.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = '7858540741:AAHJS7OqRtGoj3YbgtN3JJ0HYTC99GQi3uQ';
const TELEGRAM_CHAT_ID = '-4689716037';

const SendRejectionNoticeInputSchema = z.object({
  picName: z.string(),
  notaDate: z.string(),
  segment: z.string(),
  reason: z.string(),
});

const SendRejectionNoticeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendRejectionNoticeInput = z.infer<typeof SendRejectionNoticeInputSchema>;
export type SendRejectionNoticeOutput = z.infer<typeof SendRejectionNoticeOutputSchema>;

export async function sendRejectionNotice(input: SendRejectionNoticeInput): Promise<SendRejectionNoticeOutput> {
  return sendRejectionNoticeFlow(input);
}

const sendRejectionNoticeFlow = ai.defineFlow(
  {
    name: 'sendRejectionNoticeFlow',
    inputSchema: SendRejectionNoticeInputSchema,
    outputSchema: SendRejectionNoticeOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID for Finance is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

      // Format the message content
      let message = `*Laporan Ditolak* ❌\n`;
      message += `--------------------\n`;
      message += `*PIC:* ${input.picName}\n`;
      message += `*Tanggal Nota:* ${input.notaDate}\n`;
      message += `*Segmen:* ${input.segment}\n`;
      message += `*Alasan:* ${input.reason}`;

      // Send the message with Markdown parsing
      await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram rejection notice:', error);
      const errorMessage = error.response?.body?.description || error.message || 'Terjadi kesalahan saat mengirim notifikasi penolakan.';
      return { success: false, error: errorMessage };
    }
  }
);
