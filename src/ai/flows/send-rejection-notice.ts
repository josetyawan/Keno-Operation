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

const rejectionNoticeFlow = ai.defineFlow(
  {
    name: 'rejectionNoticeFlow',
    inputSchema: rejectionNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi penolakan laporan nota untuk Telegram. Gunakan format Markdown.
      
      - PIC: ${input.picName}
      - Tanggal Nota: ${input.notaDate}
      - Segmen: ${input.segment}
      - Alasan Penolakan: ${input.reason}
      
      Gunakan emoji ❌ dan instruksikan pengguna untuk memeriksa aplikasi dan mengirim ulang.`,
    });

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_FINANCE) {
      const errorMessage = 'Konfigurasi Telegram untuk Finance (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_FINANCE) tidak diatur.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    await sendTelegramMessage({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID_FINANCE,
        text: text,
    });

    return text;
  }
);

export async function sendRejectionNotice(
  input: z.infer<typeof rejectionNoticeSchema>
): Promise<string> {
  return rejectionNoticeFlow(input);
}
