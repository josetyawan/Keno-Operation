
'use server';

import { sendTelegramMessage } from '@/lib/telegram';

interface RekapPayload {
    rekapMessages: string[];
    photos: string[];
    photoCaption?: string;
}

/**
 * A server action that receives pre-processed data and sends it to Telegram.
 * It sends each unit's rekap as a separate message.
 */
export async function triggerDailyRekapAction(payload: RekapPayload): Promise<{success: boolean, message: string}> {
    try {
        if (payload.rekapMessages.length === 0 && payload.photos.length === 0) {
             return { success: true, message: 'Tidak ada data rekap untuk dikirim hari ini.' };
        }
        
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID_ABSENSI;

        if (!botToken || !chatId) {
          throw new Error('TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_ABSENSI tidak diatur di file .env');
        }

        // Send text messages one by one
        for (const messageText of payload.rekapMessages) {
            await sendTelegramMessage({
                botToken,
                chatId,
                text: messageText,
            });
            // Add a small delay to prevent hitting Telegram's rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Send photos as a separate, single message group
        if (payload.photos.length > 0) {
            await sendTelegramMessage({
                botToken,
                chatId,
                text: payload.photoCaption, // Use the caption as the message text if available for the media group
                photoUrls: payload.photos,
                photoCaption: payload.photoCaption,
            });
        }

        return {
          success: true,
          message: `Rekap berhasil dikirim. ${payload.rekapMessages.length} pesan teks dan ${payload.photos.length} foto dikirim.`
        };
    } catch (error: any) {
        console.error('Error in manual rekap trigger action:', error);
        return { success: false, message: error.message };
    }
}
