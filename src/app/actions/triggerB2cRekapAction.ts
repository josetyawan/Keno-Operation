'use server';

import { sendProductivityRekap } from '@/ai/flows/send-b2c-rekap';
import { sendTelegramMessage } from '@/lib/telegram';

interface RekapPayload {
  unit: string;
  totalSales: number;
  totalVisit: number;
}

export async function triggerB2cRekapAction(
  payload: RekapPayload
): Promise<{ success: boolean; message: string }> {
  try {
    if (payload.totalSales === 0 && payload.totalVisit === 0) {
      return { success: true, message: 'Tidak ada data rekap untuk dikirim.' };
    }

    const messageText = await sendProductivityRekap({
      date: new Date().toISOString(),
      unit: payload.unit,
      totalSales: payload.totalSales,
      totalVisit: payload.totalVisit,
    });

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      throw new Error('TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID tidak diatur di file .env');
    }

    await sendTelegramMessage({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
        text: messageText,
    });

    return {
      success: true,
      message: `Rekap produktivitas untuk unit ${payload.unit} berhasil dikirim.`,
    };
  } catch (error: any) {
    console.error('Error in manual B2C rekap trigger action:', error);
    return { success: false, message: error.message };
  }
}
