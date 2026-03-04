'use server';

/**
 * @fileOverview This file defines a Genkit flow for sending a notification about a specific Gamas designator rejection to a Telegram group.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = '8043290500:AAGxBvwZvkyASJb3a_q8wEBiveyVE2NN9lY';
const TELEGRAM_CHAT_ID = '-5007075772'; // Ops Channel

const SendGamasDesignatorNoticeInputSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  designator: z.string(),
  rejectionReason: z.string(),
});

const SendGamasDesignatorNoticeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendGamasDesignatorNoticeInput = z.infer<typeof SendGamasDesignatorNoticeInputSchema>;
export type SendGamasDesignatorNoticeOutput = z.infer<typeof SendGamasDesignatorNoticeOutputSchema>;

export async function sendGamasDesignatorNotice(input: SendGamasDesignatorNoticeInput): Promise<SendGamasDesignatorNoticeOutput> {
  return sendGamasDesignatorNoticeFlow(input);
}

const sendGamasDesignatorNoticeFlow = ai.defineFlow(
  {
    name: 'sendGamasDesignatorNoticeFlow',
    inputSchema: SendGamasDesignatorNoticeInputSchema,
    outputSchema: SendGamasDesignatorNoticeOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID for Ops is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
      
      let message = `*Eviden Gamas Ditolak* ❌\n\n`;
      message += `*No. Tiket:* ${input.noTiket}\n`;
      message += `*Teknisi:* ${input.userName}\n`;
      message += `*Designator:* ${input.designator}\n`;
      message += `*Alasan Penolakan:* ${input.rejectionReason}\n\n`;
      message += `Mohon kepada teknisi untuk segera melakukan perbaikan dan mengunggah ulang eviden.`;

      await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send Telegram gamas designator notice:', error);
      const errorMessage = error.response?.body?.description || error.message || 'Gagal mengirim notifikasi.';
      return { success: false, error: errorMessage };
    }
  }
);
