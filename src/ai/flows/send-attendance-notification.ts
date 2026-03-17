
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
    let emoji = 'ℹ️';
    if (input.status.toLowerCase().includes('hadir')) emoji = '✅';
    if (input.status.toLowerCase().includes('terlambat')) emoji = '⏰';
    if (input.status.toLowerCase().includes('izin')) emoji = '📝';
    if (input.status.toLowerCase().includes('cuti')) emoji = '🌴';
    if (input.status.toLowerCase().includes('request')) emoji = '🔄';

    let message = `${emoji} <b>Notifikasi Absensi</b>\n\n`;
    message += `<b>Nama:</b> ${escapeHtml(input.userName)}\n`;
    message += `<b>Status:</b> ${escapeHtml(input.status)}\n`;
    if (input.reason) {
        message += `<b>Alasan:</b> <i>${escapeHtml(input.reason)}</i>\n`;
    }
    if (input.coordinates && input.coordinates !== 'N/A') {
      message += `\n<a href="https://www.google.com/maps/search/?api=1&query=${input.coordinates}">Lihat Lokasi di Peta</a>`;
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
