
'use server';

import { ai, googleAIGenkitPlugin } from '@/ai/genkit';
import { z } from 'zod';

const attendanceNoticeSchema = z.object({
  userName: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  photoUrl: z.string().optional(),
  coordinates: z.string().optional(),
  statusEmoji: z.string(),
});

export async function sendAttendanceNotice(input: z.infer<typeof attendanceNoticeSchema>): Promise<string> {
    return sendAttendanceNoticeFlow(input);
}

const attendancePrompt = ai.definePrompt(
  {
    name: 'attendanceNoticePrompt',
    model: googleAIGenkitPlugin.model('gemini-1.5-flash'),
    input: { schema: attendanceNoticeSchema },
    prompt: `
Buat notifikasi absensi untuk dikirim ke grup Telegram.
Gunakan format yang ringkas dan informatif.

{{{statusEmoji}}} *{{{status}}}*
- *Nama:* {{{userName}}}
{{#if reason}}- *Alasan:* {{{reason}}}{{/if}}
{{#if coordinates}}- *Lokasi:* https://www.google.com/maps/search/?api=1&query={{{coordinates}}}{{/if}}

{{#if photoUrl}}[Lihat Foto Bukti]({{{photoUrl}}}){{/if}}

Buat pesan ini dalam format Markdown yang siap kirim.
`,
  }
);


const sendAttendanceNoticeFlow = ai.defineFlow(
  {
    name: 'sendAttendanceNoticeFlow',
    inputSchema: z.object({
        userName: z.string(),
        status: z.string(),
        reason: z.string().optional(),
        photoUrl: z.string().optional(),
        coordinates: z.string().optional(),
    }),
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

    const { output } = await attendancePrompt({
        ...input,
        statusEmoji: statusEmoji,
    });
    
    return output?.text() || '';
  }
);
