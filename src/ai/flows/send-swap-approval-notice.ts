'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TELEGRAM_BOT_TOKEN = '8043290500:AAGxBvwZvkyASJb3a_q8wEBiveyVE2NN9lY';
const TELEGRAM_CHAT_ID = '-4190909912'; // General HR/Ops Channel

const SendSwapApprovalNoticeInputSchema = z.object({
  requesterName: z.string(),
  replacementName: z.string(),
  swapDate: z.string(), // e.g., "Senin, 13 Mei 2024"
});

const SendSwapApprovalNoticeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendSwapApprovalNoticeInput = z.infer<typeof SendSwapApprovalNoticeInputSchema>;
export type SendSwapApprovalNoticeOutput = z.infer<typeof SendSwapApprovalNoticeOutputSchema>;

export async function sendSwapApprovalNotice(input: SendSwapApprovalNoticeInput): Promise<SendSwapApprovalNoticeOutput> {
  return sendSwapApprovalNoticeFlow(input);
}

const sendSwapApprovalNoticeFlow = ai.defineFlow(
  {
    name: 'sendSwapApprovalNoticeFlow',
    inputSchema: SendSwapApprovalNoticeInputSchema,
    outputSchema: SendSwapApprovalNoticeOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      let message = `✅ *Tukar Jaga Disetujui*\n\n`;
      message += `*Pengaju:* ${input.requesterName}\n`;
      message += `*Pengganti:* ${input.replacementName}\n`;
      message += `*Tanggal:* ${input.swapDate}\n\n`;
      message += `Jadwal telah diperbarui di sistem.`;

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
        throw new Error(responseData.description || 'Gagal mengirim notifikasi persetujuan tukar jaga.');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram swap approval notice:', error);
      const errorMessage = error.message || 'Gagal mengirim notifikasi.';
      return { success: false, error: errorMessage };
    }
  }
);
