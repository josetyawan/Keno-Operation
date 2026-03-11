'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`;

    const sendApiRequest = async (endpoint: string, payload: object) => {
        const response = await fetch(apiUrl + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseData = await response.json();
        if (!responseData.ok) {
            throw new Error(responseData.description || `Failed to call ${endpoint}`);
        }
        return responseData;
    };


    try {
      // Send the main text messages
      for (const message of input.rekapMessages) {
        await sendApiRequest('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text: `<pre>${message}</pre>`, parse_mode: 'HTML' });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If there are photos, send them as a media group
      if (input.photos && input.photos.length > 0) {
        const photoChunks = [];
        for (let i = 0; i < input.photos.length; i += 10) {
            photoChunks.push(input.photos.slice(i, i + 10));
        }
        
        if (photoChunks.length > 0 && input.photoCaption) {
            await sendApiRequest('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text: `*${input.photoCaption}*`, parse_mode: 'Markdown' });
        }

        for (const chunk of photoChunks) {
            if (chunk.length > 1) {
                const mediaGroup = chunk.map(photoUrl => ({ type: 'photo' as const, media: photoUrl }));
                await sendApiRequest('sendMediaGroup', { chat_id: TELEGRAM_CHAT_ID, media: mediaGroup });
            } else if (chunk.length === 1) {
                await sendApiRequest('sendPhoto', { chat_id: TELEGRAM_CHAT_ID, photo: chunk[0] });
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send daily rekap to Telegram:', error);
      const errorMessage = error.message || 'Gagal mengirim rekap harian.';
      return { success: false, error: errorMessage };
    }
  }
);
