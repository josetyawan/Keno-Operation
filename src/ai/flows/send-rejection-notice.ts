'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const rejectionNoticeSchema = z.object({
  picName: z.string(),
  notaDate: z.string(),
  segment: z.string(),
  reason: z.string(),
});

const rejectionNoticeFlow = ai.defineFlow(
  {
    name: 'rejectionNoticeFlow',
    inputSchema: rejectionNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi penolakan laporan nota untuk Telegram. Gunakan format Markdown.
      
      - PIC: ${input.picName}
      - Tanggal Nota: ${input.notaDate}
      - Segmen: ${input.segment}
      - Alasan Penolakan: ${input.reason}
      
      Gunakan emoji ❌ dan instruksikan pengguna untuk memeriksa aplikasi dan mengirim ulang.`,
    });
    return text;
  }
);

export async function sendRejectionNotice(
  input: z.infer<typeof rejectionNoticeSchema>
): Promise<string> {
  return rejectionNoticeFlow(input);
}
