'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TELEGRAM_BOT_TOKEN = '7909439830:AAFZj0k030AuqOprUki3uGt-oWhy5RNZ6t4';
const TELEGRAM_CHAT_ID = '-1002355896218';

const SendB2CRekapInputSchema = z.object({
  summaryMessage: z.string(),
  detailMessage: z.string(),
});

const SendB2CRekapOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendB2CRekapInput = z.infer<typeof SendB2CRekapInputSchema>;
export type SendB2CRekapOutput = z.infer<typeof SendB2CRekapOutputSchema>;

export async function sendB2cRekap(input: SendB2CRekapInput): Promise<SendB2CRekapOutput> {
  return sendB2cRekapFlow(input);
}

const sendB2cRekapFlow = ai.defineFlow(
  {
    name: 'sendB2cRekapFlow',
    inputSchema: SendB2CRekapInputSchema,
    outputSchema: SendB2CRekapOutputSchema,
  },
  async (input) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Telegram Bot Token or Chat ID for B2C Rekap is not configured.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const sendApiRequest = async (text: string) => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `<pre>${text}</pre>`,
          parse_mode: 'HTML',
        }),
      });
      const responseData = await response.json();
      if (!responseData.ok) {
        console.error('Telegram API Error:', responseData);
        throw new Error(responseData.description || 'Failed to send message');
      }
      return responseData;
    };

    try {
      // Send summary message
      await sendApiRequest(input.summaryMessage);
      
      // Wait a bit before sending the detail to ensure order
      await new Promise(resolve => setTimeout(resolve, 1000)); 

      // Send detail message
      await sendApiRequest(input.detailMessage);

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send B2C rekap to Telegram:', error);
      const errorMessage = error.message || 'Gagal mengirim rekap B2C.';
      return { success: false, error: errorMessage };
    }
  }
);
