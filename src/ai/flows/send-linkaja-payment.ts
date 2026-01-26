'use server';

/**
 * @fileOverview This file defines a Genkit flow for initiating a payment via the Finpay API (for LinkAja).
 * IMPORTANT: The request body and authentication headers are based on common payment gateway patterns.
 * You MUST verify and adjust them according to the official Finpay API documentation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schemas for input and output.
// The recipient is often configured on the Finpay/merchant dashboard, so it might not be needed here.
const SendLinkAjaPaymentInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string(),
  // A unique ID for this specific transaction.
  invoiceId: z.string(),
});

const SendLinkAjaPaymentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  transactionId: z.string().optional(),
  redirectUrl: z.string().url().optional(), // Payment gateways sometimes return a URL to complete payment
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
        LINKAJA_MERCHANT_ID,
        LINKAJA_MERCHANT_KEY,
        LINKAJA_API_ENDPOINT,
        LINKAJA_ACCOUNT_NUMBER 
    } = process.env;

    if (!LINKAJA_MERCHANT_ID || !LINKAJA_MERCHANT_KEY || !LINKAJA_API_ENDPOINT || !LINKAJA_ACCOUNT_NUMBER) {
      const errorMsg = 'Kredensial atau konfigurasi API LinkAja/Finpay belum lengkap di file .env.';
      console.error(errorMsg);
      return { success: false, message: errorMsg };
    }
    
    // --- PENTING: SESUAIKAN PAYLOAD INI ---
    // Struktur body ini adalah contoh umum untuk API billing.
    // Anda HARUS menyesuaikannya dengan dokumentasi API Finpay yang sebenarnya.
    const requestBody = {
      merchant_id: LINKAJA_MERCHANT_ID,
      invoice: input.invoiceId,
      amount: input.amount,
      description: input.description,
      source_of_funds: "linkaja", // Parameter spesifik untuk e-money
      // Finpay mungkin memerlukan info pelanggan:
      // customer_name: 'Nama Pelanggan',
      // customer_phone: '08123456789',
      // customer_email: 'pelanggan@email.com',
    };

    // --- PENTING: SESUAIKAN HEADER OTENTIKASI INI ---
    // Skema otentikasi Finpay kemungkinan besar memerlukan 'signature' yang di-hash
    // dari beberapa bagian payload + merchant key.
    // Contoh: signature = sha256(merchant_id + invoice_id + amount + merchant_key)
    // Kode di bawah ini adalah placeholder sederhana.
    const headers = {
        'Content-Type': 'application/json',
        'X-MERCHANT-ID': LINKAJA_MERCHANT_ID,
        // 'X-SIGNATURE': calculatedSignature, // Anda perlu menghitung signature ini
        'Authorization': `Bearer ${LINKAJA_MERCHANT_KEY}` // Ini adalah tebakan, bisa jadi salah
    };

    try {
      console.log('Mengirim permintaan ke Finpay API Endpoint:', LINKAJA_API_ENDPOINT);
      console.log('Headers:', JSON.stringify(headers, null, 2));
      console.log('Payload:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(LINKAJA_API_ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.message || responseData.error_description || `API returned status ${response.status}`;
        console.error('Finpay API Error:', errorMessage, responseData);
        return { success: false, message: `Gagal: ${errorMessage}` };
      }

      console.log('Finpay API Success:', responseData);
      return { 
        success: true, 
        message: responseData.message || 'Pembayaran berhasil diproses oleh Finpay.',
        transactionId: responseData.transaction_id || input.invoiceId,
        redirectUrl: responseData.redirect_url,
      };

    } catch (error: any) {
      console.error('Gagal menghubungi Finpay API:', error);
      return {
        success: false,
        message: `Terjadi kesalahan jaringan atau koneksi ke Finpay: ${error.message}`,
      };
    }
  }
);
