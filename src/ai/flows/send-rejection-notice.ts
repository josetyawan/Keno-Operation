
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const rejectionNoticeSchema = z.object({
  picName: z.string(),
  notaDate: z.string(),
  segment: z.string(),
  reason: z.string(),
});

export async function sendRejectionNotice(
  input: z.infer<typeof rejectionNoticeSchema>
): Promise<string> {
  return sendRejectionNoticeFlow(input);
}

const rejectionNoticePrompt = ai.definePrompt({
    name: 'rejectionNoticePrompt',
    model: 'googleai/gemini-1.5-pro-latest',
    input: { schema: rejectionNoticeSchema },
    prompt: `
Buatkan notifikasi penolakan laporan nota untuk dikirim ke Telegram.
Gunakan format yang jelas, singkat, dan profesional. Gunakan emoji yang sesuai (misal: ❌).

Detail Laporan Ditolak:
- PIC: {{{picName}}}
- Tanggal Nota: {{{notaDate}}}
- Segmen: {{{segment}}}
- Alasan Penolakan: {{{reason}}}

Pesan harus menginstruksikan PIC untuk memeriksa detail penolakan di aplikasi, memperbaiki laporannya, dan mengirim ulang untuk verifikasi.
`,
});


const sendRejectionNoticeFlow = ai.defineFlow(
  {
    name: 'sendRejectionNotice',
    inputSchema: rejectionNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await rejectionNoticePrompt(input);
    return output?.text || '';
  }
);
