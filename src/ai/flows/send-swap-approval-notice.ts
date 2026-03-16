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
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_B2C_MTC) {
      console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID_B2C_MTC is not set.');
      return text; // Return the generated text even if sending fails
    }

    try {
      await sendTelegramMessage({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID_B2C_MTC,
        text: text,
      });
    } catch (error) {
      console.error('Failed to send swap approval notice to Telegram:', error);
      // Don't re-throw, just log the error.
    }

    // 3. Return the generated text as before
    return text;
  }
);

export async function sendSwapApprovalNotice(
  input: z.infer<typeof swapApprovalNoticeSchema>
): Promise<string> {
  return swapApprovalNoticeFlow(input);
}
