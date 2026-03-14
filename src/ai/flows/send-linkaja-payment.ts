'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const linkAjaInputSchema = z.object({
  amount: z.number(),
  description: z.string(),
  invoiceId: z.string(),
});
type LinkAjaInput = z.infer<typeof linkAjaInputSchema>;

const linkAjaOutputSchema = z.object({
  success: z.boolean(),
  redirectUrl: z.string().optional(),
  message: z.string().optional(),
});
type LinkAjaOutput = z.infer<typeof linkAjaOutputSchema>;

export async function sendLinkAjaPayment(
  input: LinkAjaInput
): Promise<LinkAjaOutput> {
  return sendLinkAjaPaymentFlow(input);
}

// This flow is a placeholder/mock. A real implementation would require a custom tool
// to interact with a payment gateway like Finpay.
const sendLinkAjaPaymentFlow = ai.defineFlow(
  {
    name: 'sendLinkAjaPayment',
    inputSchema: linkAjaInputSchema,
    outputSchema: linkAjaOutputSchema,
  },
  async (input) => {
    // In a real scenario, you would call a tool here to interact with the Finpay/LinkAja API.
    // e.g., const paymentResult = await tools.finpay.createPayment(input);

    // For now, we return a mock success response with a dummy redirect URL.
    const mockRedirectUrl = `https://mock-payment-gateway.com/pay?invoice=${input.invoiceId}&amount=${input.amount}`;

    return {
      success: true,
      redirectUrl: mockRedirectUrl,
      message: 'Silakan lanjutkan pembayaran di halaman berikutnya.',
    };
  }
);
