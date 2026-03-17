
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
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi penolakan laporan nota untuk Telegram dalam format HTML (hanya gunakan tag <b>, <i>, dan <code>).
      
      - <b>PIC:</b> ${escapeHtml(input.picName)}
      - <b>Tanggal Nota:</b> ${input.notaDate}
      - <b>Segmen:</b> ${escapeHtml(input.segment)}
      - <b>Alasan Penolakan:</b> <i>${escapeHtml(input.reason)}</i>
      
      Gunakan emoji ❌ dan instruksikan pengguna untuk memeriksa aplikasi dan mengirim ulang.`,
    });
    return text;
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
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_FINANCE) {
    const errorMessage = 'Konfigurasi Telegram untuk Finance (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_FINANCE) tidak diatur.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
      await sendTelegramMessage({
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          chatId: process.env.TELEGRAM_CHAT_ID_FINANCE,
          text: messageText,
      });
  } catch(e: any) {
      console.error("Telegram message sending failed:", e);
      throw new Error(`Gagal mengirim notifikasi ke Telegram: ${e.message}`);
  }
}
