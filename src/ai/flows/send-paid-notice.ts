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

export async function sendPaidNotice(input: z.infer<typeof sendPaidNoticeInputSchema>): Promise<string> {
  return sendPaidNoticeFlow(input);
}

const sendPaidNoticeFlow = ai.defineFlow(
  {
    name: 'sendPaidNotice',
    inputSchema: sendPaidNoticeInputSchema,
    outputSchema: z.string(),
  },
  async ({ paidData, grandTotal, paidDate }) => {
    // Convert array of objects to a string representation for the prompt
    const rekapString = paidData
      .map(
        (item) =>
          `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal}`
      )
      .join('\n');

    const prompt = `
Buat notifikasi pembayaran LUNAS untuk dikirim ke grup Telegram.
Gunakan format yang rapi dan informatif, dengan emoji yang sesuai (misal: ✅💸).
Berikut adalah data pembayaran yang telah dilunasi:

Tanggal Pembayaran: ${paidDate}

Data:
${rekapString}

---
GRAND TOTAL LUNAS: Rp ${grandTotal.toLocaleString('id-ID')}

Tambahkan ucapan terima kasih dan konfirmasi bahwa semua laporan terverifikasi pada periode tersebut telah dibayarkan.
`;

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: prompt,
    });

    // In a real implementation, the generated text would be sent to a Telegram tool.
    return llmResponse.text;
  }
);
