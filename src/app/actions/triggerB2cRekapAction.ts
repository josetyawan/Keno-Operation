'use server';

import { sendProductivityRekap } from '@/ai/flows/send-b2c-rekap';

interface RekapPayload {
    unit: string;
    summaryMessage: string;
    detailMessage: string;
}

/**
 * A server action that receives pre-formatted rekap messages and sends them to Telegram.
 */
export async function triggerB2cRekapAction(payload: RekapPayload): Promise<{success: boolean, message: string}> {
    try {
        if (!payload.summaryMessage && !payload.detailMessage) {
             return { success: true, message: 'Tidak ada data rekap untuk dikirim.' };
        }
        
        const result = await sendProductivityRekap(payload);
        
        if (result.success) {
            return { success: true, message: `Rekap produktivitas untuk unit ${payload.unit} berhasil dikirim.` };
        } else {
             throw new Error(result.error || `Gagal mengirim rekap ke Telegram untuk unit ${payload.unit}.`);
        }
    } catch (error: any) {
        console.error('Error in manual B2C rekap trigger action:', error);
        return { success: false, message: error.message };
    }
}
