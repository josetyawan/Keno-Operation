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

type AttendanceNoticeInput = z.infer<typeof attendanceNoticeSchema>;

export async function sendAttendanceNotice(input: AttendanceNoticeInput): Promise<string> {
    return sendAttendanceNoticeFlow(input);
}

const sendAttendanceNoticeFlow = ai.defineFlow(
  {
    name: 'sendAttendanceNoticeFlow',
    inputSchema: attendanceNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    let statusEmoji = '🔔';
    if (input.status.toLowerCase().includes('hadir') || input.status.toLowerCase().includes('progres')) {
        statusEmoji = '✅';
    } else if (input.status.toLowerCase().includes('terlambat')) {
        statusEmoji = '⏰';
    } else if (input.status.toLowerCase().includes('izin')) {
        statusEmoji = '📝';
    } else if (input.status.toLowerCase().includes('cuti')) {
        statusEmoji = '🌴';
    } else if (input.status.toLowerCase().includes('tukar')) {
        statusEmoji = '🤝';
    }

    const prompt = `
Buat notifikasi absensi untuk dikirim ke grup Telegram.
Gunakan format yang ringkas dan informatif.

${statusEmoji} *${input.status}*
- *Nama:* ${input.userName}
${input.reason ? `- *Alasan:* ${input.reason}` : ''}
${input.coordinates && input.coordinates !== 'N/A' ? `- *Lokasi:* https://www.google.com/maps/search/?api=1&query=${input.coordinates}` : ''}

${input.photoUrl ? `[Lihat Foto Bukti](${input.photoUrl})` : ''}

Buat pesan ini dalam format Markdown yang siap kirim.
`;

    const res = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt,
    });
    
    // In a real implementation, this would be sent to a Telegram tool.
    return res.text;
  }
);
