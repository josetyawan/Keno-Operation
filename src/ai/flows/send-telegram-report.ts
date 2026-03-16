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

const sendTelegramReportFlow = ai.defineFlow(
  {
    name: 'sendTelegramReportFlow',
    inputSchema: sendTelegramReportInputSchema,
    outputSchema: z.string(),
  },
  async ({ rekapData, grandTotal, rekapDate }) => {
    const rekapString = rekapData
        .map(item => `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal}`)
        .join('\n');
    
    const grandTotalFormatted = grandTotal.toLocaleString('id-ID');

    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat laporan rekap pembayaran untuk dikirim ke grup Telegram. Format harus Markdown.
      
      Data:
      - Judul: Laporan Rekap Pembayaran
      - Tanggal Rekap: ${rekapDate}
      - Data (format: No.HP Nama Segmen Tanggal Nominal):
      ${rekapString}
      - GRAND TOTAL: Rp ${grandTotalFormatted}
      
      Jaga agar format tetap rapi dan mudah dibaca.`,
    });
    return text;
  }
);

export async function sendTelegramReport(input: z.infer<typeof sendTelegramReportInputSchema>): Promise<{ success: boolean; error?: string }> {
    try {
        const reportText = await sendTelegramReportFlow(input);
        
        console.log('Generated Telegram Report to be sent:', reportText);

        return { success: true };
    } catch (error: any) {
        console.error("Error in sendTelegramReport flow:", error);
        return { success: false, error: error.message || 'An unknown error occurred in the AI flow.' };
    }
}
