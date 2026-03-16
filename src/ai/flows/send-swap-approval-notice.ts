'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const swapApprovalNoticeSchema = z.object({
  requesterName: z.string(),
  replacementName: z.string(),
  swapDate: z.string(),
});

const swapApprovalNoticeFlow = ai.defineFlow(
  {
    name: 'swapApprovalNoticeFlow',
    inputSchema: swapApprovalNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ requesterName, replacementName, swapDate }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi persetujuan tukar jadwal jaga untuk Telegram. Gunakan format Markdown.
      
      - Tanggal: ${swapDate}
      - Teknisi Awal: ${requesterName}
      - Teknisi Pengganti: ${replacementName}
      
      Gunakan emoji ✅🤝 dan ucapkan terima kasih kepada teknisi pengganti.`,
    });
    return text;
  }
);

export async function sendSwapApprovalNotice(
  input: z.infer<typeof swapApprovalNoticeSchema>
): Promise<string> {
  return swapApprovalNoticeFlow(input);
}
