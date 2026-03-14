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

const sendRejectionNoticeFlow = ai.defineFlow(
  {
    name: 'sendRejectionNotice',
    inputSchema: rejectionNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const prompt = `
Buatkan notifikasi penolakan laporan nota untuk dikirim ke Telegram.
Gunakan format yang jelas, singkat, dan profesional. Gunakan emoji yang sesuai (misal: ❌).

Detail Laporan Ditolak:
- PIC: ${input.picName}
- Tanggal Nota: ${input.notaDate}
- Segmen: ${input.segment}
- Alasan Penolakan: ${input.reason}

Pesan harus menginstruksikan PIC untuk memeriksa detail penolakan di aplikasi, memperbaiki laporannya, dan mengirim ulang untuk verifikasi.
`;

    const res = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt,
    });

    // In a real implementation, this would be sent to a Telegram tool.
    return res.text;
  }
);
