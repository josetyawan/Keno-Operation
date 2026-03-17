
'use server';

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

// This flow now ONLY generates the message text
const gamasReportNoticeTextFlow = async ({ userName, noTiket, status, rejectionReason }: z.infer<typeof gamasReportNoticeSchema>): Promise<string> => {
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

// This exported function now handles the sending
export async function sendGamasReportNotice(
  input: z.infer<typeof gamasReportNoticeSchema>
): Promise<void> {
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
}
