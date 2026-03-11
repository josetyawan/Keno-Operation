'use server';

import { sendB2cRekap } from '@/ai/flows/send-b2c-rekap';

interface RekapPayload {
  summaryMessage: string;
  detailMessage: string;
}

export async function triggerB2cRekapAction(payload: RekapPayload): Promise<{success: boolean, message: string}> {
    try {
        if (!payload.summaryMessage || !payload.detailMessage) {
            throw new Error('Pesan ringkasan atau detail tidak boleh kosong.');
        }

        const result = await sendB2cRekap({
            summaryMessage: payload.summaryMessage,
            detailMessage: payload.detailMessage,
        });

        if (result.success) {
            return { success: true, message: 'Rekap B2C berhasil dikirim.' };
        } else {
            throw new Error(result.error || 'Gagal mengirim rekap B2C ke Telegram.');
        }

    } catch (error: any) {
        console.error('Error in triggerB2cRekapAction:', error);
        return { success: false, message: error.message };
    }
}
