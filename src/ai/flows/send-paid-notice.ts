'use server';

/**
 * @fileOverview This file defines a Genkit flow for sending a "paid" notification to a Telegram group.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = '7858540741:AAHJS7OqRtGoj3YbgtN3JJ0HYTC99GQi3uQ';
const TELEGRAM_CHAT_ID = '-4689716037'; // Group ID from user

// Re-using the same schema as the rekap report
const PaidDataItemSchema = z.object({
  phone: z.string(),
  name: z.string(),
  segmen: z.string(),
  tanggal: z.string(),
  nominal: z.number(),
  userId: z.string(),
});

const SendPaidNoticeInputSchema = z.object({
  paidData: z.array(PaidDataItemSchema),
  grandTotal: z.number(),
  paidDate: z.string(),
});

const SendPaidNoticeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendPaidNoticeInput = z.infer<typeof SendPaidNoticeInputSchema>;
export type SendPaidNoticeOutput = z.infer<typeof SendPaidNoticeOutputSchema>;

export async function sendPaidNotice(input: SendPaidNoticeInput): Promise<SendPaidNoticeOutput> {
  return sendPaidNoticeFlow(input);
}

const sendPaidNoticeFlow = ai.defineFlow(
  {
    name: 'sendPaidNoticeFlow',
    inputSchema: SendPaidNoticeInputSchema,
    outputSchema: SendPaidNoticeOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN) {
      const errorMsg = 'Telegram Bot Token is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

      // Format the message content, similar to rekap but with "Paid" status
      let message = `*Pembayaran Berhasil (Paid)* ✅\n`;
      message += `Tanggal Pembayaran: ${input.paidDate}\n`;
      message += `====================\n\n`;

      message += input.paidData
        .map(item => {
            // Subtotal row
            if (item.name.startsWith('TOTAL ')) {
                 return `\n*${item.name}*: Rp ${item.nominal.toLocaleString('id-ID')}\n${'-'.repeat(20)}`;
            }
            // Individual item row
            return `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} Rp ${item.nominal.toLocaleString('id-ID')}`;
        })
        .join('\n');
        
      message += `\n\n====================\n*Total Dibayar:* Rp ${input.grandTotal.toLocaleString('id-ID')}`;

      // Send the message with Markdown parsing
      await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram paid notice:', error);
      const errorMessage = error.response?.body?.description || error.message || 'Terjadi kesalahan saat mengirim notifikasi pembayaran.';
      return { success: false, error: errorMessage };
    }
  }
);
