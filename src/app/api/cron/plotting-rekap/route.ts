
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { ProvisioningRecord } from '@/lib/types';
import { sendPlottingRekap } from '@/ai/flows/send-plotting-rekap';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

async function fetchCollection<T>(firestore: any, collectionName: string, constraints: any[] = []): Promise<T[]> {
    const ref = collection(firestore, collectionName);
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export async function GET(request: NextRequest) {
    try {
        const { firestore } = initializeFirebase();
        
        // Fetch only orders that are "active" for today, now including unassigned
        const allActiveOrders = await fetchCollection<ProvisioningRecord>(firestore, 'provisioning-records', [
            where('provisioningStatus', 'in', ['unassigned', 'assigned', 'picked_up', 'departed', 'arrived', 'wip_odp_done', 'kendala'])
        ]);
        
        if (allActiveOrders.length === 0) {
            return NextResponse.json({ message: 'No active orders to report for plotting.' });
        }

        const messageText = await sendPlottingRekap({
            orders: allActiveOrders,
            dateHeader: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: idLocale }),
        });

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID_PROVISIONING;

        if (!botToken || !chatId) {
            throw new Error(`TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID_PROVISIONING tidak diatur di file .env`);
        }

        await sendTelegramMessage({
            botToken,
            chatId,
            text: messageText,
        });

        return NextResponse.json({ success: true, message: `Plotting teknisi berhasil dikirim.` });
        
    } catch (error: any) {
        console.error('Error in plotting-rekap cron:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
