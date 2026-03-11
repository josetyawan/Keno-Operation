'use server';

/**
 * @fileOverview This file defines a Genkit flow for sending a Gamas report status notification to a Telegram group.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TELEGRAM_BOT_TOKEN = '8043290500:AAGxBvwZvkyASJb3a_q8wEBiveyVE2NN9lY';
const TELEGRAM_CHAT_ID = '-5007075772';

const SendGamasReportNoticeInputSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  status: z.string(), // "Disetujui" atau "Ditolak"
  rejectionReason: z.string().optional(),
});

const SendGamasReportNoticeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendGamasReportNoticeInput = z.infer<typeof SendGamasReportNoticeInputSchema>;
export type SendGamasReportNoticeOutput = z.infer<typeof SendGamasReportNoticeOutputSchema>;

export async function sendGamasReportNotice(input: SendGamasReportNoticeInput): Promise<SendGamasReportNoticeOutput> {
  return sendGamasReportNoticeFlow(input);
}

const sendGamasReportNoticeFlow = ai.defineFlow(
  {
    name: 'sendGamasReportNoticeFlow',
    inputSchema: SendGamasReportNoticeInputSchema,
    outputSchema: SendGamasReportNoticeOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID for Ops is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const statusIcon = input.status === 'Disetujui' ? '✅' : '❌';
      let message = `*Status Laporan Gamas Diperbarui* ${statusIcon}\n\n`;
      message += `*No. Tiket:* ${input.noTiket}\n`;
      message += `*Teknisi:* ${input.userName}\n`;
      message += `*Status Baru:* ${input.status}\n`;
      
      if (input.rejectionReason) {
        message += `*Alasan:* ${input.rejectionReason}\n`;
      }
      
      message += `\nLaporan telah diproses oleh atasan.`;

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
      console.error('Failed to send Telegram gamas report notice:', error);
      const errorMessage = error.message || 'Gagal mengirim notifikasi.';
      return { success: false, error: errorMessage };
    }
  }
);
