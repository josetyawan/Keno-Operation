
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

const gamasReportPrompt = ai.definePrompt({
    name: 'gamasReportNoticePrompt',
    input: { schema: gamasReportNoticeSchema },
    output: { schema: z.string() },
    prompt: `
Buatkan notifikasi singkat untuk laporan Gamas yang baru saja ditinjau.
Tujuan: Menginformasikan teknisi tentang status laporannya.
Format: Siap kirim ke Telegram. Gunakan emoji yang sesuai.

Detail Laporan:
- No. Tiket: {{{noTiket}}}
- Teknisi: {{{userName}}}
- Status Baru: {{{status}}}
{{#if rejectionReason}}- Alasan Penolakan: {{{rejectionReason}}}{{/if}}

Buat pesan yang jelas dan to-the-point.
`
});


const sendGamasReportNoticeFlow = ai.defineFlow(
  {
    name: 'sendGamasReportNotice',
    inputSchema: gamasReportNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await gamasReportPrompt(input);
    return output!;
  }
);
