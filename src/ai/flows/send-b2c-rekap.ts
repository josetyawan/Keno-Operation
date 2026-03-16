'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const sendProductivityRekapInputSchema = z.object({
  unit: z.string(),
  totalSales: z.number(),
  totalVisit: z.number(),
  date: z.string(),
});

const sendProductivityRekapFlow = ai.defineFlow(
  {
    name: 'sendProductivityRekapFlow',
    inputSchema: sendProductivityRekapInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // AI temporarily disabled to ensure app stability.
    // This returns a placeholder message.
    const message = `
*Rekap Produktivitas (AI Dinonaktifkan)*
-------------------------
*Unit:* ${input.unit}
*Tanggal:* ${input.date}
*Total Sales/Pekerjaan:* ${input.totalSales}
*Total Teknisi Produktif:* ${input.totalVisit}
    `.trim();
    return message;
  }
);

export async function sendProductivityRekap(
  input: z.infer<typeof sendProductivityRekapInputSchema>
): Promise<string> {
  return sendProductivityRekapFlow(input);
}
