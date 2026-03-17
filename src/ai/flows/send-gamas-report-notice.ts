'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendTelegramMessage } from '@/lib/telegram';

const gamasReportNoticeSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  status: z.string(),
  rejectionReason: z.string().optional(),
});

function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const gamasReportNoticeTextFlow = ai.defineFlow(
  {
    name: 'gamasReportNoticeTextFlow',
    inputSchema: gamasReportNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ userName, noTiket, status, rejectionReason }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi status Laporan Gamas untuk Telegram dalam format HTML (hanya gunakan tag <b>, <i>, dan <code>).
      - No. Tiket: <code>${escapeHtml(noTiket)}</code>
      - Teknisi: ${escapeHtml(userName)}
      - Status Baru: <b>${escapeHtml(status)}</b>
      ${rejectionReason ? `- Alasan Penolakan: <i>${escapeHtml(rejectionReason)}</i>` : ''}
      
      Gunakan emoji ✅ untuk 'Disetujui' dan ❌ untuk 'Ditolak'.`,
    });
    return text;
  }
);

export async function sendGamasReportNotice(
  input: z.infer<typeof gamasReportNoticeSchema>
): Promise<string> {
  const messageText = await gamasReportNoticeTextFlow(input);
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_GAMAS) {
      const errorMessage = 'Konfigurasi Telegram untuk Gamas (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_GAMAS) tidak diatur.';
      console.error(errorMessage);
      throw new Error(errorMessage);
  }

  await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID_GAMAS,
      text: messageText,
  });

  return messageText;
}
