'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

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

const swapApprovalPrompt = ai.definePrompt({
    name: 'swapApprovalNoticePrompt',
    model: googleAI.model('gemini-pro'),
    input: { schema: swapApprovalNoticeSchema },
    prompt: `
Buatkan notifikasi singkat untuk persetujuan tukar jadwal jaga.
Tujuan: Menginformasikan kedua teknisi bahwa pertukaran telah disetujui.
Format: Siap kirim ke Telegram. Gunakan emoji yang sesuai (misal: ✅🤝).

Detail Pertukaran:
- Tanggal: {{{swapDate}}}
- Teknisi Awal (Request): {{{requesterName}}}
- Teknisi Pengganti: {{{replacementName}}}

Buat pesan yang jelas, singkat, dan informatif. Ucapkan terima kasih kepada teknisi pengganti.
`
});

const sendSwapApprovalNoticeFlow = ai.defineFlow(
  {
    name: 'sendSwapApprovalNotice',
    inputSchema: swapApprovalNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await swapApprovalPrompt(input);
    return output?.text || '';
  }
);
