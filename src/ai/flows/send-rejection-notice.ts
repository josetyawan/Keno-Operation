
'use server';

import { ai } from '@/ai/genkit';
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

const rejectionNoticeTextFlow = ai.defineFlow(
  {
    name: 'rejectionNoticeTextFlow',
    inputSchema: rejectionNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    let message = `❌ <b>Laporan Nota Ditolak</b> ❌\n\n`;
    message += `Laporan nota dari <b>${escapeHtml(input.picName)}</b> telah ditolak.\n\n`;
    message += `- <b>Tanggal Nota:</b> ${input.notaDate}\n`;
    message += `- <b>Segmen:</b> ${escapeHtml(input.segment)}\n`;
    message += `- <b>Alasan Penolakan:</b> <i>${escapeHtml(input.reason)}</i>\n\n`;
    message += `Mohon untuk memeriksa kembali laporan di aplikasi dan mengirim ulang jika diperlukan.`;
    return message;
  }
);

export async function sendRejectionNotice(
  input: z.infer<typeof rejectionNoticeSchema>
): Promise<void> {
  let messageText;
  try {
      messageText = await rejectionNoticeTextFlow(input);
  } catch (e: any) {
      console.error("AI flow for rejection notice failed:", e);
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
  } catch(e: any) {
      console.error("Telegram message sending failed:", e);
      throw new Error(`Gagal mengirim notifikasi ke Telegram: ${e.message}`);
  }
}
