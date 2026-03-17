'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendTelegramMessage } from '@/lib/telegram';

const swapApprovalNoticeSchema = z.object({
  requesterName: z.string(),
  replacementName: z.string(),
  swapDate: z.string(),
});

const swapApprovalNoticeFlow = ai.defineFlow(
  {
    name: 'swapApprovalNoticeFlow',
    inputSchema: swapApprovalNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ requesterName, replacementName, swapDate }) => {
    // 1. Generate the message with AI
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi persetujuan tukar jadwal jaga untuk Telegram. Gunakan format Markdown.
      
      - Tanggal: ${swapDate}
      - Teknisi Awal: ${requesterName}
      - Teknisi Pengganti: ${replacementName}
      
      Gunakan emoji ✅🤝 dan ucapkan terima kasih kepada teknisi pengganti.`,
    });
    
    // 2. Send the message to the Absensi group
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_ABSENSI) {
      const errorMessage = 'Konfigurasi Telegram untuk Absensi (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_ABSENSI) tidak diatur.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID_ABSENSI,
      text: text,
    });

    // 3. Return the generated text as before
    return text;
  }
);

export async function sendSwapApprovalNotice(
  input: z.infer<typeof swapApprovalNoticeSchema>
): Promise<string> {
  return swapApprovalNoticeFlow(input);
}
