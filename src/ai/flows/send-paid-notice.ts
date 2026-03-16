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
      .map(item => {
          if (item.segmen === '') { // Handle total rows
              return `\n${item.name} ${item.nominal.toLocaleString('id-ID')}`;
          }
          return `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal.toLocaleString('id-ID')}`;
      })
      .join('\n');
      
    const grandTotalFormatted = grandTotal.toLocaleString('id-ID');

    // Manually format the message
    const message = `
✅💸 LUNAS 💸✅

Tanggal Pembayaran: ${paidDate}

Data Terbayar (No.HP Nama Segmen Tanggal Nominal):
${rekapString}

GRAND TOTAL LUNAS: Rp ${grandTotalFormatted}

Terima kasih atas kerja keras rekan-rekan semua. Tetap jaga kesehatan dan keselamatan kerja. 💪
    `.trim();

    return message;
  }
);

export async function sendPaidNotice(input: z.infer<typeof sendPaidNoticeInputSchema>): Promise<string> {
  return sendPaidNoticeFlow(input);
}
