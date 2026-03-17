
'use server';

import { sendTelegramReport } from '@/ai/flows/send-telegram-report';
import { sendPaidNotice } from '@/ai/flows/send-paid-notice';
import { sendTelegramMessage } from '@/lib/telegram';
import type { RekapDataItem, CashTransaction } from '@/lib/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface SendRekapPayload {
    rekapData: RekapDataItem[];
    grandTotal: number;
    rekapDate: string;
}

export async function sendRekapAction(payload: SendRekapPayload): Promise<{ success: boolean; message?: string }> {
    try {
        const reportText = await sendTelegramReport(payload);

        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_FINANCE) {
            throw new Error('Konfigurasi Telegram untuk Finance tidak ditemukan.');
        }

        await sendTelegramMessage({
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID_FINANCE,
            text: reportText,
        });

        return { success: true };

    } catch (error: any) {
        console.error('sendRekapAction Error:', error);
        return { success: false, message: error.message };
    }
}

interface SendPaidNoticePayload {
    paidData: RekapDataItem[];
    grandTotal: number;
    paidDate: string;
}

export async function sendPaidNotificationAction(payload: SendPaidNoticePayload): Promise<{ success: boolean; message?: string }> {
    try {
        const paidNoticeText = await sendPaidNotice({
            paidData: payload.paidData,
            grandTotal: payload.grandTotal,
            paidDate: payload.paidDate,
        });

        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_FINANCE) {
            throw new Error('Konfigurasi Telegram untuk Finance tidak ditemukan.');
        }

        await sendTelegramMessage({
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID_FINANCE,
            text: paidNoticeText,
        });
        
        return { success: true };
    } catch (error: any) {
        console.error('sendPaidNotificationAction Error:', error);
        return { success: false, message: error.message };
    }
}
