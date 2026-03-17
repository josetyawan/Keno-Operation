
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
    let message = `✅🤝 <b>Persetujuan Tukar Jaga</b> 🤝✅\n\n`;
    message += `Permintaan tukar jaga untuk tanggal <b>${swapDate}</b> telah disetujui.\n\n`;
    message += `- Teknisi Awal: ${escapeHtml(requesterName)}\n`;
    message += `- Teknisi Pengganti: ${escapeHtml(replacementName)}\n\n`;
    message += `Terima kasih kepada <b>${escapeHtml(replacementName)}</b> atas kesediaannya untuk menggantikan.`;
    return message;
  }
);

export async function sendSwapApprovalNotice(
  input: z.infer<typeof swapApprovalNoticeSchema>
): Promise<void> {
  let messageText;
  try {
    messageText = await swapApprovalNoticeTextFlow(input);
  } catch (e: any) {
     console.error("AI flow for swap approval notice failed:", e);
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
