'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendTelegramMessage } from '@/lib/telegram';

const swapApprovalNoticeSchema = z.object({
  requesterName: z.string(),
  replacementName: z.string(),
  swapDate: z.string(),
});

function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const swapApprovalNoticeTextFlow = ai.defineFlow(
  {
    name: 'swapApprovalNoticeTextFlow',
    inputSchema: swapApprovalNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ requesterName, replacementName, swapDate }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `Buat notifikasi persetujuan tukar jadwal jaga untuk Telegram dalam format HTML (hanya gunakan tag <b> dan <i>).
      
      - <b>Tanggal:</b> ${swapDate}
      - <b>Teknisi Awal:</b> ${escapeHtml(requesterName)}
      - <b>Teknisi Pengganti:</b> ${escapeHtml(replacementName)}
      
      Gunakan emoji ✅🤝 dan ucapkan terima kasih kepada teknisi pengganti.`,
    });
    return text;
  }
);

export async function sendSwapApprovalNotice(
  input: z.infer<typeof swapApprovalNoticeSchema>
): Promise<string> {
  const messageText = await swapApprovalNoticeTextFlow(input);
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_ABSENSI) {
    const errorMessage = 'Konfigurasi Telegram untuk Absensi (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_ABSENSI) tidak diatur.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  await sendTelegramMessage({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID_ABSENSI,
    text: messageText,
  });

  return messageText;
}
