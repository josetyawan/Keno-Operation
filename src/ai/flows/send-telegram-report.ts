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

// This is a wrapper function for the AI flow to align with the expected return type in the component.
export async function sendTelegramReport(input: z.infer<typeof sendTelegramReportInputSchema>): Promise<{ success: boolean; error?: string }> {
    try {
        const reportText = await sendTelegramReportFlow(input);
        
        // In a real-world scenario, you'd use a tool to send this `reportText` to a Telegram service.
        // For now, we log it and simulate a successful operation.
        console.log('Generated Telegram Report to be sent:', reportText);

        return { success: true };
    } catch (error: any) {
        console.error("Error in sendTelegramReport flow:", error);
        return { success: false, error: error.message || 'An unknown error occurred in the AI flow.' };
    }
}

const sendTelegramReportFlow = ai.defineFlow(
  {
    name: 'sendTelegramReportFlow',
    inputSchema: sendTelegramReportInputSchema,
    outputSchema: z.string(),
  },
  async ({ rekapData, grandTotal, rekapDate }) => {
    // Convert array of objects to a string representation for the prompt
    const rekapString = rekapData
        .map(item => `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal}`)
        .join('\n');

    const prompt = `
Buat laporan rekap pembayaran untuk dikirim ke Telegram.
Gunakan format yang rapi dan mudah dibaca.
Berikut adalah data rekapnya dalam format: [No. Pembayaran] [Nama] [Segmen] [Tanggal] [Nominal]

Tanggal Rekap: ${rekapDate}

Data:
${rekapString}

---
GRAND TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}

Tambahkan header dan footer yang sesuai untuk laporan ini. Pastikan formatnya ringkas.
`;
    
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: prompt,
    });
    
    return llmResponse.text;
  }
);
