'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TELEGRAM_BOT_TOKEN = '7909439830:AAFZj0k030AuqOprUki3uGt-oWhy5RNZ6t4';

const CHAT_ID_MAP: Record<string, string> = {
  'B2C': '-1001762864793',
  'MTC': '-1001762864793',
  'B2B': '-1002355896218',
  'Provisioning': '-1003642678189',
};


const SendProductivityRekapInputSchema = z.object({
  unit: z.string(),
  summaryMessage: z.string(),
  detailMessage: z.string(),
});

const SendProductivityRekapOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SendProductivityRekapInput = z.infer<typeof SendProductivityRekapInputSchema>;
export type SendProductivityRekapOutput = z.infer<typeof SendProductivityRekapOutputSchema>;

export async function sendProductivityRekap(input: SendProductivityRekapInput): Promise<SendProductivityRekapOutput> {
  return sendProductivityRekapFlow(input);
}

const sendProductivityRekapFlow = ai.defineFlow(
  {
    name: 'sendProductivityRekapFlow',
    inputSchema: SendProductivityRekapInputSchema,
    outputSchema: SendProductivityRekapOutputSchema,
  },
  async (input) => {
    const chatId = CHAT_ID_MAP[input.unit];

    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      const errorMsg = `Telegram Bot Token or Chat ID for unit ${input.unit} is not configured.`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const sendApiRequest = async (text: string) => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
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
      if (input.summaryMessage) {
        await sendApiRequest(input.summaryMessage);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Send detail message
      if (input.detailMessage) {
        await sendApiRequest(input.detailMessage);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Failed to send productivity rekap for ${input.unit} to Telegram:`, error);
      const errorMessage = error.message || `Gagal mengirim rekap ${input.unit}.`;
      return { success: false, error: errorMessage };
    }
  }
);
