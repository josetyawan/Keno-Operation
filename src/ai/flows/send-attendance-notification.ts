'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi singkat untuk Telegram dalam format Markdown. Mulai dengan emoji yang sesuai.
      
      Data:
      - Status: ${input.status}
      - Nama: ${input.userName}
      - Alasan: ${input.reason || 'Tidak ada'}
      `,
    });
    
    let message = text;
    if (input.coordinates) {
      message += `\n- *Lokasi:* https://www.google.com/maps/search/?api=1&query=${input.coordinates}`;
    }
    if (input.photoUrl) {
      message += `\n\n[Lihat Foto Bukti](${input.photoUrl})`;
    }
    return message;
  }
);

export async function sendAttendanceNotice(input: z.infer<typeof attendanceNoticeSchema>): Promise<string> {
  return attendanceNoticeFlow(input);
}
