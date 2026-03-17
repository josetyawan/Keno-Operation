
'use server';

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

// This flow now ONLY generates the message text
const gamasDesignatorNoticeTextFlow = async ({ userName, noTiket, designator, rejectionReason }: z.infer<typeof gamasDesignatorNoticeSchema>): Promise<string> => {
    let message = `⚠️ <b>Eviden Gamas Ditolak</b> ⚠️\n\n`;
    message += `Mohon perhatian untuk Teknisi <b>${escapeHtml(userName)}</b>.\n\n`;
    message += `Eviden untuk tiket <code>${escapeHtml(noTiket)}</code> dengan designator <code>${escapeHtml(designator)}</code> telah ditolak.\n\n`;
    message += `<b>Alasan Penolakan:</b>\n<i>${escapeHtml(rejectionReason)}</i>\n\n`;
    message += `Harap segera periksa dan perbaiki eviden di aplikasi.`;
    return message;
}


// This exported function now handles the sending
export async function sendGamasDesignatorNotice(
  input: z.infer<typeof gamasDesignatorNoticeSchema>
): Promise<void> {
  const messageText = await gamasDesignatorNoticeTextFlow(input);
  
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
