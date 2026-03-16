'use server';

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
    // AI flow is temporarily disabled to resolve model availability issues.
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
    
    let message = `${statusEmoji} *${input.status}*\n`;
    message += `- *Nama:* ${input.userName}\n`;
    if (input.reason) message += `- *Alasan:* ${input.reason}\n`;
    if (input.coordinates) message += `- *Lokasi:* https://www.google.com/maps/search/?api=1&query=${input.coordinates}\n`;
    if (input.photoUrl) message += `\n[Lihat Foto Bukti](${input.photoUrl})`;
    
    return Promise.resolve(message);
}
