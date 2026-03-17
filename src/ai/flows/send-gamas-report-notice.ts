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

const gamasReportNoticeFlow = ai.defineFlow(
  {
    name: 'gamasReportNoticeFlow',
    inputSchema: gamasReportNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ userName, noTiket, status, rejectionReason }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi status Laporan Gamas untuk Telegram. Gunakan format Markdown.
      - No. Tiket: ${noTiket}
      - Teknisi: ${userName}
      - Status Baru: ${status}
      ${rejectionReason ? `- Alasan Penolakan: ${rejectionReason}` : ''}
      
      Gunakan emoji ✅ untuk 'Disetujui' dan ❌ untuk 'Ditolak'.`,
    });
    
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_GAMAS) {
        const errorMessage = 'Konfigurasi Telegram untuk Gamas (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_GAMAS) tidak diatur.';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    await sendTelegramMessage({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID_GAMAS,
        text: text,
    });

    return text;
  }
);

export async function sendGamasReportNotice(
  input: z.infer<typeof gamasReportNoticeSchema>
): Promise<string> {
  return gamasReportNoticeFlow(input);
}
