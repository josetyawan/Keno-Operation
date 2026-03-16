'use server';

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


const sendTelegramReportFlow = async ({ rekapData, grandTotal, rekapDate }: z.infer<typeof sendTelegramReportInputSchema>): Promise<string> => {
    // AI flow is temporarily disabled to resolve model availability issues.
    const rekapString = rekapData
        .map(item => `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal}`)
        .join('\n');
    
    const grandTotalFormatted = grandTotal.toLocaleString('id-ID');

    const message = `
*Laporan Rekap Pembayaran*
*Tanggal Rekap:* ${rekapDate}

*Data:*
${rekapString}

---
*GRAND TOTAL: Rp ${grandTotalFormatted}*

(Laporan ini dibuat otomatis. AI dinonaktifkan)
    `.trim();

    return Promise.resolve(message);
  }
