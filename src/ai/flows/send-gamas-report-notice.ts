'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const gamasReportNoticeSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  status: z.string(),
  rejectionReason: z.string().optional(),
});

export async function sendGamasReportNotice(
  input: z.infer<typeof gamasReportNoticeSchema>
): Promise<string> {
  return sendGamasReportNoticeFlow(input);
}

const sendGamasReportNoticeFlow = ai.defineFlow(
  {
    name: 'sendGamasReportNotice',
    inputSchema: gamasReportNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const prompt = `
Buatkan notifikasi singkat untuk laporan Gamas yang baru saja ditinjau.
Tujuan: Menginformasikan teknisi tentang status laporannya.
Format: Siap kirim ke Telegram. Gunakan emoji yang sesuai.

Detail Laporan:
- No. Tiket: ${input.noTiket}
- Teknisi: ${input.userName}
- Status Baru: ${input.status}
${input.rejectionReason ? `- Alasan Penolakan: ${input.rejectionReason}` : ''}

Buat pesan yang jelas dan to-the-point.
`;

    const res = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt,
    });

    // In a real implementation, this would likely call a tool to send the message.
    // For now, we return the generated text.
    return res.text;
  }
);
