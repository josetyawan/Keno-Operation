
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendTelegramMessage } from '@/lib/telegram';

const gamasDesignatorNoticeSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  designator: z.string(),
  rejectionReason: z.string(),
});

function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const gamasDesignatorNoticeTextFlow = ai.defineFlow(
  {
    name: 'gamasDesignatorNoticeTextFlow',
    inputSchema: gamasDesignatorNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ userName, noTiket, designator, rejectionReason }) => {
    let message = `⚠️ <b>Eviden Gamas Ditolak</b> ⚠️\n\n`;
    message += `Mohon perhatian untuk Teknisi <b>${escapeHtml(userName)}</b>.\n\n`;
    message += `Eviden untuk tiket <code>${escapeHtml(noTiket)}</code> dengan designator <code>${escapeHtml(designator)}</code> telah ditolak.\n\n`;
    message += `<b>Alasan Penolakan:</b>\n<i>${escapeHtml(rejectionReason)}</i>\n\n`;
    message += `Harap segera periksa dan perbaiki eviden di aplikasi.`;
    return message;
  }
);

export async function sendGamasDesignatorNotice(
  input: z.infer<typeof gamasDesignatorNoticeSchema>
): Promise<void> {
  let messageText;
  try {
    messageText = await gamasDesignatorNoticeTextFlow(input);
  } catch (e: any) {
    console.error("AI flow for Gamas designator notice failed:", e);
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
