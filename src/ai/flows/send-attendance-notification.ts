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

    return message;
  }
);

// This exported function now handles the sending
export async function sendAttendanceNotice(input: z.infer<typeof attendanceNoticeSchema>): Promise<string> {
  const messageText = await attendanceNoticeTextFlow(input);

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_ABSENSI) {
      const errorMessage = 'Konfigurasi Telegram untuk Absensi (TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_ABSENSI) tidak diatur.';
      console.error(errorMessage);
      throw new Error(errorMessage);
  }
  
  await sendTelegramMessage({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID_ABSENSI,
    text: messageText,
    photoUrls: input.photoUrl ? [input.photoUrl] : [],
    photoCaption: messageText // Use the same text for caption if there is a photo
  });

  return messageText;
}
