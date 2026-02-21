'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = '7858540741:AAHJS7OqRtGoj3YbgtN3JJ0HYTC99GQi3uQ';
const TELEGRAM_CHAT_ID = '-4689716037';

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
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

      let caption = `*Absensi Baru: ${input.userName}*\n\n`;
      caption += `*Status:* ${input.status}\n`;
      if (input.reason) {
        caption += `*Alasan:* ${input.reason}\n`;
      }
      if (input.coordinates && input.coordinates !== 'N/A') {
        caption += `*Lokasi:* [Lihat di Peta](https://www.google.com/maps/search/?api=1&query=${input.coordinates})\n`;
      }

      if (input.photoUrl) {
        await bot.sendPhoto(TELEGRAM_CHAT_ID, input.photoUrl, {
          caption: caption,
          parse_mode: 'Markdown',
        });
      } else {
        await bot.sendMessage(TELEGRAM_CHAT_ID, caption, { parse_mode: 'Markdown' });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram attendance notice:', error);
      const errorMessage = error.response?.body?.description || error.message || 'Gagal mengirim notifikasi.';
      return { success: false, error: errorMessage };
    }
  }
);
