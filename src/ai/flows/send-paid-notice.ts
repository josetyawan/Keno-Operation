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
  // return sendPaidNoticeFlow(input);
  console.log("AI Flow 'sendPaidNotice' is temporarily disabled due to API issues.");
  return Promise.resolve("AI feature is temporarily disabled.");
}

const paidNoticePrompt = ai.definePrompt({
    name: 'paidNoticePrompt',
    model: 'googleai/gemini-pro',
    input: { schema: z.object({
        rekapString: z.string(),
        grandTotal: z.number(),
        paidDate: z.string(),
        grandTotalFormatted: z.string(),
    }) },
    prompt: `
Buat notifikasi pembayaran LUNAS untuk dikirim ke grup Telegram.
Gunakan format yang rapi dan informatif, dengan emoji yang sesuai (misal: ✅💸).
Berikut adalah data pembayaran yang telah dilunasi:

Tanggal Pembayaran: {{{paidDate}}}

Data:
{{{rekapString}}}

---
GRAND TOTAL LUNAS: Rp {{{grandTotalFormatted}}}

Tambahkan ucapan terima kasih dan konfirmasi bahwa semua laporan terverifikasi pada periode tersebut telah dibayarkan.
`,
});

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

    const { output } = await paidNoticePrompt({
        rekapString,
        grandTotal,
        paidDate,
        grandTotalFormatted: grandTotal.toLocaleString('id-ID'),
    });
    
    return output?.text || '';
  }
);
