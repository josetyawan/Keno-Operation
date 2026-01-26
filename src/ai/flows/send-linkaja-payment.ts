'use server';

/**
 * @fileOverview This file defines a Genkit flow for initiating a payment via a hypothetical LinkAja API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schemas for input and output
const SendLinkAjaPaymentInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string(),
  recipientAccount: z.string().describe("The recipient's account number or ID."),
});

const SendLinkAjaPaymentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  transactionId: z.string().optional(),
});

export type SendLinkAjaPaymentInput = z.infer<typeof SendLinkAjaPaymentInputSchema>;
export type SendLinkAjaPaymentOutput = z.infer<typeof SendLinkAjaPaymentOutputSchema>;

// Main exported function that wraps the Genkit flow
export async function sendLinkAjaPayment(input: SendLinkAjaPaymentInput): Promise<SendLinkAjaPaymentOutput> {
  return sendLinkAjaPaymentFlow(input);
}

// The Genkit flow definition
const sendLinkAjaPaymentFlow = ai.defineFlow(
  {
    name: 'sendLinkAjaPaymentFlow',
    inputSchema: SendLinkAjaPaymentInputSchema,
    outputSchema: SendLinkAjaPaymentOutputSchema,
  },
  async (input) => {
    const { 
        LINKAJA_API_KEY, 
        LINKAJA_SECRET_KEY, 
        LINKAJA_API_ENDPOINT,
        LINKAJA_ACCOUNT_NUMBER 
    } = process.env;

    if (!LINKAJA_API_KEY || LINKAJA_API_KEY === 'GANTI_DENGAN_API_KEY_ANDA' || !LINKAJA_SECRET_KEY || !LINKAJA_API_ENDPOINT || !LINKAJA_ACCOUNT_NUMBER) {
      const errorMsg = 'Kredensial API LinkAja belum dikonfigurasi di file .env.';
      console.error(errorMsg);
      return { success: false, message: errorMsg };
    }
    
    // Ini adalah contoh payload. Anda HARUS menyesuaikannya dengan dokumentasi API LinkAja yang sebenarnya.
    const requestBody = {
      source_account: LINKAJA_ACCOUNT_NUMBER,
      destination_account: input.recipientAccount,
      amount: input.amount,
      description: input.description,
      transaction_id: `TXN-${Date.now()}` // ID transaksi unik
    };

    try {
      console.log('Mengirim permintaan ke LinkAja API Endpoint:', LINKAJA_API_ENDPOINT);
      console.log('Payload:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(LINKAJA_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Skema otentikasi ini adalah contoh. LinkAja mungkin menggunakan 'Authorization: Bearer <token>' atau skema lain.
          'X-API-KEY': LINKAJA_API_KEY,
          'X-SECRET-KEY': LINKAJA_SECRET_KEY, 
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Jika API mengembalikan error, tangkap dan teruskan pesannya.
        const errorMessage = responseData.message || `API returned status ${response.status}`;
        console.error('LinkAja API Error:', errorMessage, responseData);
        return { success: false, message: `Gagal: ${errorMessage}` };
      }

      // Jika berhasil
      console.log('LinkAja API Success:', responseData);
      return { 
        success: true, 
        message: 'Pembayaran berhasil diproses oleh LinkAja.',
        transactionId: responseData.transactionId || requestBody.transaction_id,
      };

    } catch (error: any) {
      console.error('Gagal menghubungi LinkAja API:', error);
      return {
        success: false,
        message: `Terjadi kesalahan jaringan: ${error.message}`,
      };
    }
  }
);
