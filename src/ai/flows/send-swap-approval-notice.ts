'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const swapApprovalNoticeSchema = z.object({
  requesterName: z.string(),
  replacementName: z.string(),
  swapDate: z.string(),
});

export async function sendSwapApprovalNotice(
  input: z.infer<typeof swapApprovalNoticeSchema>
): Promise<string> {
  return sendSwapApprovalNoticeFlow(input);
}

const sendSwapApprovalNoticeFlow = ai.defineFlow(
  {
    name: 'sendSwapApprovalNotice',
    inputSchema: swapApprovalNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const prompt = `
Buatkan notifikasi singkat untuk persetujuan tukar jadwal jaga.
Tujuan: Menginformasikan kedua teknisi bahwa pertukaran telah disetujui.
Format: Siap kirim ke Telegram. Gunakan emoji yang sesuai (misal: ✅🤝).

Detail Pertukaran:
- Tanggal: ${input.swapDate}
- Teknisi Awal (Request): ${input.requesterName}
- Teknisi Pengganti: ${input.replacementName}

Buat pesan yang jelas, singkat, dan informatif. Ucapkan terima kasih kepada teknisi pengganti.
`;

    const res = await ai.generate({
      model: 'gemini-1.5-flash-latest',
      prompt,
    });

    // In a real implementation, this would call a tool to send the message.
    // For now, we return the generated text.
    return res.text;
  }
);
