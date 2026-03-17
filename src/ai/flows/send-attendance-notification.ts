
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendTelegramMessage } from '@/lib/telegram';

const attendanceNoticeSchema = z.object({
  userName: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  photoUrl: z.string().optional(),
  coordinates: z.string().optional(),
});

function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// This flow now ONLY generates the message text
const attendanceNoticeTextFlow = ai.defineFlow(
  {
    name: 'attendanceNoticeTextFlow',
    inputSchema: attendanceNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // 1. Generate the base message
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi singkat untuk Telegram dalam format HTML sederhana (hanya gunakan tag <b> dan <i>). Mulai dengan emoji yang sesuai.
      
      <b>Data:</b>
      - <b>Status:</b> ${escapeHtml(input.status)}
      - <b>Nama:</b> ${escapeHtml(input.userName)}
      - <b>Alasan:</b> ${escapeHtml(input.reason || 'Tidak ada')}
      `,
    });
    
    // 2. Compose the final message with optional links
    let message = text;
    if (input.coordinates && input.coordinates !== 'N/A') {
      message += `\n- <b>Lokasi:</b> <a href="https://www.google.com/maps/search/?api=1&query=${input.coordinates}">Lihat di Peta</a>`;
    }

    return message;
  }
);

// This exported function now handles the sending
export async function sendAttendanceNotice(input: z.infer<typeof attendanceNoticeSchema>): Promise<void> {
  let messageText;
  try {
    messageText = await attendanceNoticeTextFlow(input);
  } catch (e: any) {
    console.error("AI flow for attendance notice failed:", e);
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
      photoUrls: input.photoUrl ? [input.photoUrl] : [],
      photoCaption: messageText // Use the same text for caption if there is a photo
    });
  } catch (e: any) {
    console.error("Telegram message sending failed:", e);
    throw new Error(`Gagal mengirim notifikasi ke Telegram: ${e.message}`);
  }
}
