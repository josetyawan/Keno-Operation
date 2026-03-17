
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
    const isApproved = status.toLowerCase() === 'disetujui';
    const emoji = isApproved ? '✅' : '❌';
    let message = `${emoji} <b>Update Status Laporan Gamas</b> ${emoji}\n\n`;
    message += `- No. Tiket: <code>${escapeHtml(noTiket)}</code>\n`;
    message += `- Teknisi: ${escapeHtml(userName)}\n`;
    message += `- Status Baru: <b>${escapeHtml(status)}</b>\n`;
    if (rejectionReason) {
      message += `- Alasan Penolakan: <i>${escapeHtml(rejectionReason)}</i>\n`;
    }
    return message;
  }
);

export async function sendGamasReportNotice(
  input: z.infer<typeof gamasReportNoticeSchema>
): Promise<void> {
  let messageText;
  try {
    messageText = await gamasReportNoticeTextFlow(input);
  } catch(e: any) {
    console.error("AI flow for Gamas report notice failed:", e);
    throw new Error(`Gagal membuat teks notifikasi AI: ${e.message}`);
  }
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_ABSENSI) {
      const errorMessage = 'Konfigurasi Telegram untuk Absensi (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_ABSENSI) tidak diatur.';
      console.error(errorMessage);
      throw new Error(errorMessage);
  }

  try {
    await sendTelegramMessage({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID_ABSENSI,
        text: messageText,
    });
  } catch (e: any) {
    console.error("Telegram message sending failed:", e);
    throw new Error(`Gagal mengirim notifikasi ke Telegram: ${e.message}`);
  }
}
