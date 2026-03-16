'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const rekapDataItemSchema = z.object({
  phone: z.string(),
  name: z.string(),
  segmen: z.string(),
  tanggal: z.string(),
  nominal: z.number(),
  userId: z.string(),
  notaId: z.string().optional(),
});

const sendPaidNoticeInputSchema = z.object({
  paidData: z.array(rekapDataItemSchema),
  grandTotal: z.number(),
  paidDate: z.string(),
});

const sendPaidNoticeFlow = ai.defineFlow(
  {
    name: 'sendPaidNoticeFlow',
    inputSchema: sendPaidNoticeInputSchema,
    outputSchema: z.string(),
  },
  async ({ paidData, grandTotal, paidDate }) => {
    const rekapString = paidData
      .map(
        (item) =>
          `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal}`
      )
      .join('\n');
      
    const grandTotalFormatted = grandTotal.toLocaleString('id-ID');

    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat pengumuman pembayaran lunas untuk grup Telegram. Gunakan format Markdown.
      
      Data:
      - Tanggal Pembayaran: ${paidDate}
      - Data Terbayar (format: No.HP Nama Segmen Tanggal Nominal):
      ${rekapString}
      - GRAND TOTAL LUNAS: Rp ${grandTotalFormatted}

      Gunakan emoji yang meriah seperti ✅💸 dan sampaikan terima kasih atas kerja keras rekan-rekan.`,
    });
    return text;
  }
);

export async function sendPaidNotice(input: z.infer<typeof sendPaidNoticeInputSchema>): Promise<string> {
  return sendPaidNoticeFlow(input);
}
