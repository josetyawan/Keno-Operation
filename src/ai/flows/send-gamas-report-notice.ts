'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const gamasReportNoticeSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  status: z.string(),
  rejectionReason: z.string().optional(),
});

const gamasReportNoticeFlow = ai.defineFlow(
  {
    name: 'gamasReportNoticeFlow',
    inputSchema: gamasReportNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ userName, noTiket, status, rejectionReason }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi status Laporan Gamas untuk Telegram. Gunakan format Markdown.
      - No. Tiket: ${noTiket}
      - Teknisi: ${userName}
      - Status Baru: ${status}
      ${rejectionReason ? `- Alasan Penolakan: ${rejectionReason}` : ''}
      
      Gunakan emoji ✅ untuk 'Disetujui' dan ❌ untuk 'Ditolak'.`,
    });
    return text;
  }
);

export async function sendGamasReportNotice(
  input: z.infer<typeof gamasReportNoticeSchema>
): Promise<string> {
  return gamasReportNoticeFlow(input);
}
