
'use server';

import { sendProductivityRekap } from '@/ai/flows/send-b2c-rekap';
import { sendTelegramMessage } from '@/lib/telegram';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface RekapPayload {
  unit: string;
  summaryData: any[]; // Using any to avoid importing zod schemas
  detailData: any[];
}

export async function triggerB2cRekapAction(
  payload: RekapPayload
): Promise<{ success: boolean; message: string }> {
  try {
    if (payload.summaryData.length === 0) {
      return { success: true, message: 'Tidak ada data rekap untuk dikirim.' };
    }

    const messageText = await sendProductivityRekap({
      date: format(new Date(), 'dd MMMM yyyy', { locale: idLocale }),
      unit: payload.unit,
      summaryData: payload.summaryData,
      detailData: payload.detailData,
    });

    let targetChatId: string | undefined;
    const unit = payload.unit;
    if (unit === 'B2C' || unit === 'MTC') {
        targetChatId = process.env.TELEGRAM_CHAT_ID_B2C_MTC;
    } else if (unit === 'B2B') {
        targetChatId = process.env.TELEGRAM_CHAT_ID_B2B;
    } else if (unit === 'Provisioning') {
        targetChatId = process.env.TELEGRAM_CHAT_ID_PROVISIONING;
    }

    if (!process.env.TELEGRAM_BOT_TOKEN || !targetChatId) {
      throw new Error(`TELEGRAM_BOT_TOKEN atau CHAT_ID untuk unit ${unit} tidak diatur di file .env`);
    }

    await sendTelegramMessage({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: targetChatId,
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
