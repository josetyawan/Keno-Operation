
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
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi Telegram dalam format HTML (hanya gunakan tag <b>, <i>, dan <code>) untuk memberitahu teknisi bahwa salah satu eviden gamas mereka ditolak.
      
      <b>Data Laporan:</b>
      - Teknisi: ${escapeHtml(userName)}
      - No. Tiket: <code>${escapeHtml(noTiket)}</code>
      - Designator Ditolak: <code>${escapeHtml(designator)}</code>
      - Alasan Penolakan: <b>${escapeHtml(rejectionReason)}</b>
      
      Gunakan emoji ⚠️ dan minta teknisi untuk segera memperbaikinya.`,
    });
    return text;
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
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_GAMAS) {
      const errorMessage = 'Konfigurasi Telegram untuk Gamas (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_GAMAS) tidak diatur.';
      console.error(errorMessage);
      throw new Error(errorMessage);
  }
  
  try {
    await sendTelegramMessage({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID_GAMAS,
        text: messageText,
    });
  } catch (e: any) {
    console.error("Telegram message sending failed:", e);
    throw new Error(`Gagal mengirim notifikasi ke Telegram: ${e.message}`);
  }
}
