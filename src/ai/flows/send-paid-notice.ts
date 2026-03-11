'use server';

/**
 * @fileOverview This file defines a Genkit flow for sending a "paid" notification to a Telegram group.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TELEGRAM_BOT_TOKEN = '7858540741:AAHJS7OqRtGoj3YbgtN3JJ0HYTC99GQi3uQ';
const TELEGRAM_CHAT_ID = '-4689716037';

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
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID for Finance is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
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
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const responseData = await response.json();
      if (!responseData.ok) {
        throw new Error(responseData.description || 'Gagal mengirim notifikasi.');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram paid notice:', error);
      const errorMessage = error.message || 'Terjadi kesalahan saat mengirim notifikasi pembayaran.';
      return { success: false, error: errorMessage };
    }
  }
);
