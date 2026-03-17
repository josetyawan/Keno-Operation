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

const attendanceNoticeFlow = ai.defineFlow(
  {
    name: 'attendanceNoticeFlow',
    inputSchema: attendanceNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // This flow now also sends the message directly to Telegram.
    
    // 1. Generate the base message (still using AI for now, can be changed to simple string later)
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi singkat untuk Telegram dalam format Markdown. Mulai dengan emoji yang sesuai.
      
      Data:
      - Status: ${input.status}
      - Nama: ${input.userName}
      - Alasan: ${input.reason || 'Tidak ada'}
      `,
    });
    
    // 2. Compose the final message with optional links
    let message = text;
    if (input.coordinates && input.coordinates !== 'N/A') {
      message += `\n- *Lokasi:* https://www.google.com/maps/search/?api=1&query=${input.coordinates}`;
    }

    // 3. Send to Telegram using the specific Absensi bot
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_ABSENSI) {
        const errorMessage = 'Konfigurasi Telegram untuk Absensi (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_ABSENSI) tidak diatur.';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
    
    await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID_ABSENSI,
      text: message,
      photoUrls: input.photoUrl ? [input.photoUrl] : [],
      photoCaption: message // Use the same text for caption if there is a photo
    });

    return message;
  }
);

export async function sendAttendanceNotice(input: z.infer<typeof attendanceNoticeSchema>): Promise<string> {
  return attendanceNoticeFlow(input);
}
