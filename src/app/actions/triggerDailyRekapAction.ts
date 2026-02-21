'use server';

import { sendDailyRekapReport } from '@/ai/flows/send-daily-rekap-report';

interface RekapPayload {
    rekapMessages: string[];
    photos: string[];
    photoCaption?: string;
}

/**
 * A simplified server action that only accepts pre-processed data and sends it to Telegram.
 * It no longer performs any Firestore operations.
 */
export async function triggerDailyRekapAction(payload: RekapPayload): Promise<{success: boolean, message: string}> {
    try {
        if (payload.rekapMessages.length === 0 && payload.photos.length === 0) {
             return { success: true, message: 'Tidak ada data rekap untuk dikirim hari ini.' };
        }
        
        const result = await sendDailyRekapReport(payload);
        
        if (result.success) {
            return { success: true, message: `Rekap berhasil dikirim. ${payload.rekapMessages.length} pesan teks dan ${payload.photos.length} foto dikirim.` };
        } else {
             throw new Error(result.error || 'Gagal mengirim rekap ke Telegram.');
        }
    } catch (error: any) {
        console.error('Error in manual rekap trigger action:', error);
        return { success: false, message: error.message };
    }
}
