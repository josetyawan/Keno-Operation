
'use server';

import { sendProvisioningRekap } from '@/ai/flows/send-provisioning-rekap';
import { sendTelegramMessage } from '@/lib/telegram';

// Define a more detailed payload structure
interface OrderDetail {
  scOrder: string;
  customerName: string;
  assignedTo_userName?: string;
}

interface RekapPayload {
  kendalaOrders: OrderDetail[];
  inProgressOrders: OrderDetail[];
  selesaiOrders: OrderDetail[];
}

export async function triggerProvisioningRekapAction(
  payload: RekapPayload
): Promise<{ success: boolean; message: string }> {
  try {
    const messageText = await sendProvisioningRekap(payload);

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
      message: `Rekap provisioning berhasil dikirim.`,
    };
  } catch (error: any) {
    console.error('Error in provisioning rekap trigger action:', error);
    return { success: false, message: error.message };
  }
}
