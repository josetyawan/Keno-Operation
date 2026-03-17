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
      - Teknisi: ${userName}
      - No. Tiket: <code>${noTiket}</code>
      - Designator Ditolak: <code>${designator}</code>
      - Alasan Penolakan: <b>${rejectionReason}</b>
      
      Gunakan emoji peringatan ⚠️ dan minta teknisi untuk segera memperbaikinya.`,
    });
    return text;
  }
);

export async function sendGamasDesignatorNotice(
  input: z.infer<typeof gamasDesignatorNoticeSchema>
): Promise<string> {
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
  
  return messageText;
}
