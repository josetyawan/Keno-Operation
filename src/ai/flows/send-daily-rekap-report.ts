
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = '8043290500:AAGxBvwZvkyASJb3a_q8wEBiveyVE2NN9lY';
const TELEGRAM_CHAT_ID = '-4190909912';

const SendDailyRekapInputSchema = z.object({
  rekapMessages: z.array(z.string()), // Array of report messages
  photos: z.array(z.string().url()).optional(), // Array of photo URLs
  photoCaption: z.string().optional(),
});

const SendDailyRekapOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendDailyRekapInput = z.infer<typeof SendDailyRekapInputSchema>;
export type SendDailyRekapOutput = z.infer<typeof SendDailyRekapOutputSchema>;

export async function sendDailyRekapReport(input: SendDailyRekapInput): Promise<SendDailyRekapOutput> {
  return sendDailyRekapReportFlow(input);
}

const sendDailyRekapReportFlow = ai.defineFlow(
  {
    name: 'sendDailyRekapReportFlow',
    inputSchema: SendDailyRekapInputSchema,
    outputSchema: SendDailyRekapOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

      // Send the main text messages
      for (const message of input.rekapMessages) {
        // Use pre-tags for monospaced font that respects spaces and newlines
        await bot.sendMessage(TELEGRAM_CHAT_ID, `<pre>${message}</pre>`, { parse_mode: 'HTML' });
        // Add a small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If there are photos, send them as a media group
      if (input.photos && input.photos.length > 0) {
        const photoChunks = [];
        for (let i = 0; i < input.photos.length; i += 10) {
            photoChunks.push(input.photos.slice(i, i + 10));
        }
        
        if (photoChunks.length > 0 && input.photoCaption) {
            await bot.sendMessage(TELEGRAM_CHAT_ID, `*${input.photoCaption}*`, { parse_mode: 'Markdown' });
        }

        for (const chunk of photoChunks) {
            if (chunk.length > 1) {
                const mediaGroup = chunk.map(photoUrl => ({ type: 'photo' as const, media: photoUrl }));
                await bot.sendMediaGroup(TELEGRAM_CHAT_ID, mediaGroup);
            } else if (chunk.length === 1) {
                await bot.sendPhoto(TELEGRAM_CHAT_ID, chunk[0]);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send daily rekap to Telegram:', error);
      const errorMessage = error.response?.body?.description || error.message || 'Gagal mengirim rekap harian.';
      return { success: false, error: errorMessage };
    }
  }
);
