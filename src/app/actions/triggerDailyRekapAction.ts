
'use server';

import { sendDailyRekapReport } from '@/ai/flows/send-daily-rekap-report';
import { sendTelegramMessage } from '@/lib/telegram';

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
        
        const messageText = await sendDailyRekapReport(payload);

        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_ABSENSI) {
          throw new Error('TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_ABSENSI tidak diatur di file .env');
        }

        await sendTelegramMessage({
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID_ABSENSI,
            text: messageText,
            photoUrls: payload.photos,
            photoCaption: payload.photoCaption,
        });

        return {
          success: true,
          message: `Rekap berhasil dikirim. ${payload.rekapMessages.length} pesan teks dan ${payload.photos.length} foto dikirim.`
        };
    } catch (error: any) {
        console.error('Error in manual rekap trigger action:', error);
        return { success: false, message: error.message };
    }
}
