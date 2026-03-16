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

const gamasDesignatorNoticeFlow = ai.defineFlow(
  {
    name: 'gamasDesignatorNoticeFlow',
    inputSchema: gamasDesignatorNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ userName, noTiket, designator, rejectionReason }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi Telegram dalam format Markdown untuk memberitahu teknisi bahwa salah satu eviden gamas mereka ditolak.
      
      Data:
      - Teknisi: ${userName}
      - No. Tiket: ${noTiket}
      - Designator Ditolak: ${designator}
      - Alasan Penolakan: ${rejectionReason}
      
      Gunakan emoji peringatan ⚠️ dan minta teknisi untuk segera memperbaikinya.`,
    });

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID_GAMAS) {
        try {
            await sendTelegramMessage({
                botToken: process.env.TELEGRAM_BOT_TOKEN,
                chatId: process.env.TELEGRAM_CHAT_ID_GAMAS,
                text: text,
            });
        } catch (error) {
            console.error('Failed to send Gamas designator notice to Telegram:', error);
        }
    } else {
        console.warn('Telegram token/chat ID for Gamas is not set. Skipping notification.');
    }
    
    return text;
  }
);

export async function sendGamasDesignatorNotice(
  input: z.infer<typeof gamasDesignatorNoticeSchema>
): Promise<string> {
  return gamasDesignatorNoticeFlow(input);
}
