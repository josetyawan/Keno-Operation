'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TELEGRAM_BOT_TOKEN = '8043290500:AAGxBvwZvkyASJb3a_q8wEBiveyVE2NN9lY';
const TELEGRAM_CHAT_ID = '-4190909912';

const SendAttendanceNoticeInputSchema = z.object({
  userName: z.string(),
  status: z.string(), // e.g., "Hadir", "Izin Sakit", "Terlambat"
  reason: z.string().optional(),
  photoUrl: z.string().url().optional(),
  coordinates: z.string().optional(),
});

const SendAttendanceNoticeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendAttendanceNoticeInput = z.infer<typeof SendAttendanceNoticeInputSchema>;
export type SendAttendanceNoticeOutput = z.infer<typeof SendAttendanceNoticeOutputSchema>;

export async function sendAttendanceNotice(input: SendAttendanceNoticeInput): Promise<SendAttendanceNoticeOutput> {
  return sendAttendanceNoticeFlow(input);
}

const sendAttendanceNoticeFlow = ai.defineFlow(
  {
    name: 'sendAttendanceNoticeFlow',
    inputSchema: SendAttendanceNoticeInputSchema,
    outputSchema: SendAttendanceNoticeOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      let caption = `*Absensi Baru: ${input.userName}*\n\n`;
      caption += `*Status:* ${input.status}\n`;
      if (input.reason) {
        caption += `*Alasan:* ${input.reason}\n`;
      }
      if (input.coordinates && input.coordinates !== 'N/A') {
        caption += `*Lokasi:* [Lihat di Peta](https://www.google.com/maps/search/?api=1&query=${input.coordinates})\n`;
      }

      const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`;
      let response;

      if (input.photoUrl) {
        response = await fetch(apiUrl + 'sendPhoto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            photo: input.photoUrl,
            caption: caption,
            parse_mode: 'Markdown',
          }),
        });
      } else {
        response = await fetch(apiUrl + 'sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: caption,
            parse_mode: 'Markdown',
          }),
        });
      }

      const responseData = await response.json();
      if (!responseData.ok) {
        throw new Error(responseData.description || 'Gagal mengirim notifikasi.');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram attendance notice:', error);
      const errorMessage = error.message || 'Gagal mengirim notifikasi.';
      return { success: false, error: errorMessage };
    }
  }
);
