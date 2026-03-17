
'use server';

import { z } from 'zod';
import { sendTelegramMessage } from '@/lib/telegram';

const rejectionNoticeSchema = z.object({
  picName: z.string(),
  notaDate: z.string(),
  segment: z.string(),
  reason: z.string(),
});

function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// This flow now ONLY generates the message text
const rejectionNoticeTextFlow = async (input: z.infer<typeof rejectionNoticeSchema>): Promise<string> => {
    let message = `❌ <b>Laporan Nota Ditolak</b> ❌\n\n`;
    message += `Laporan nota dari <b>${escapeHtml(input.picName)}</b> telah ditolak.\n\n`;
    message += `- <b>Tanggal Nota:</b> ${input.notaDate}\n`;
    message += `- <b>Segmen:</b> ${escapeHtml(input.segment)}\n`;
    message += `- <b>Alasan Penolakan:</b> <i>${escapeHtml(input.reason)}</i>\n\n`;
    message += `Mohon untuk memeriksa kembali laporan di aplikasi dan mengirim ulang jika diperlukan.`;
    return message;
}

// This exported function now handles the sending
export async function sendRejectionNotice(
  input: z.infer<typeof rejectionNoticeSchema>
): Promise<void> {
  const messageText = await rejectionNoticeTextFlow(input);
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_FINANCE) {
    const errorMessage = 'Konfigurasi Telegram untuk Finance (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_FINANCE) tidak diatur.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID_FINANCE,
      text: messageText,
  });
}
