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

const sendTelegramReportInputSchema = z.object({
  rekapData: z.array(rekapDataItemSchema),
  grandTotal: z.number(),
  rekapDate: z.string(),
});

export const sendTelegramReportFlow = ai.defineFlow(
  {
    name: 'sendTelegramReportFlow',
    inputSchema: sendTelegramReportInputSchema,
    outputSchema: z.string(),
  },
  async ({ rekapData, grandTotal, rekapDate }) => {
    const rekapString = rekapData
        .map(item => {
             // Handle the "TOTAL" rows which have an empty segmen
            if (item.segmen === '') {
                return `\n${item.name} ${item.nominal.toLocaleString('id-ID')}`;
            }
            return `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal.toLocaleString('id-ID')}`;
        })
        .join('\n');
    
    const grandTotalFormatted = grandTotal.toLocaleString('id-ID');

    // Manually format the message without markdown
    const message = `
Laporan Rekap Pembayaran
Tanggal Rekap: ${rekapDate}

${rekapString}

GRAND TOTAL: Rp ${grandTotalFormatted}
    `.trim();
    
    return message;
  }
);
