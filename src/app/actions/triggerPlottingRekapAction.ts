'use server';

import { sendPlottingRekap } from '@/ai/flows/send-plotting-rekap';
import { sendTelegramMessage } from '@/lib/telegram';

interface RekapPayload {
  allOrders: any[];
  dateHeader: string;
}

export async function triggerPlottingRekapAction(
  payload: RekapPayload
): Promise<{ success: boolean; message: string }> {
  try {
    const messageText = await sendPlottingRekap({
      orders: payload.allOrders,
      dateHeader: payload.dateHeader,
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

    return {
      success: true,
      message: `Plotting teknisi berhasil dikirim.`,
    };
  } catch (error: any) {
    console.error('Error in plotting rekap trigger action:', error);
    return { success: false, message: error.message };
  }
}
