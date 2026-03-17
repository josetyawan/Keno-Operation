'use server';

import { sendTelegramReportFlow } from '@/ai/flows/send-telegram-report';
import { sendPaidNotice } from '@/ai/flows/send-paid-notice';
import { sendTelegramMessage } from '@/lib/telegram';
import { doc, updateDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
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
        const reportText = await sendTelegramReportFlow(payload);

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

interface MarkAsPaidPayload {
    selectedNotaIds: string[];
    selectedTotal: number;
    paymentType: 'rembes' | 'kasbon';
    paidData: RekapDataItem[];
    userEmail: string;
}

export async function markAsPaidAction(payload: MarkAsPaidPayload): Promise<{ success: boolean; message?: string }> {
    const { firestore } = initializeFirebase();
    const paymentDate = new Date();

    try {
        for (const notaId of payload.selectedNotaIds) {
            const notaDocRef = doc(firestore, 'notas', notaId);
            await updateDoc(notaDocRef, {
                status: 'paid',
                tanggalPembayaran: paymentDate
            });
        }

        if (payload.paymentType === 'kasbon') {
            const cashTransaction: Omit<CashTransaction, 'id'> = {
                type: 'out',
                amount: payload.selectedTotal,
                date: Timestamp.fromDate(paymentDate),
                description: `Pembayaran ${payload.selectedNotaIds.length} nota via kasbon`,
                notaIds: payload.selectedNotaIds,
                createdBy: payload.userEmail,
                createdAt: Timestamp.now()
            };
            await addDoc(collection(firestore, 'cashbook'), cashTransaction);
        }

        const paidNoticeText = await sendPaidNotice({
            paidData: payload.paidData,
            grandTotal: payload.selectedTotal,
            paidDate: format(paymentDate, 'dd MMMM yyyy', { locale: idLocale }),
        });

        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID_FINANCE) {
            throw new Error('Konfigurasi Telegram untuk Finance tidak ditemukan.');
        }

        await sendTelegramMessage({
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID_FINANCE,
            text: paidNoticeText,
        });
        
        return { success: true, message: `${payload.selectedNotaIds.length} laporan telah diperbarui menjadi "paid" dan notifikasi telah dikirim.` };

    } catch (error: any) {
        console.error('markAsPaidAction Error:', error);
        return { success: false, message: error.message };
    }
}
