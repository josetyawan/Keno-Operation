
'use server';

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const sendProductivityRekapInputSchema = z.object({
  unit: z.string(),
  totalSales: z.number(),
  totalVisit: z.number(),
  date: z.string(),
});

export async function sendProductivityRekap(
  input: z.infer<typeof sendProductivityRekapInputSchema>
): Promise<string> {
  return sendProductivityRekapFlow(input);
}

const sendProductivityRekapFlow = ai.defineFlow(
  {
    name: 'sendProductivityRekap',
    inputSchema: sendProductivityRekapInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const prompt = `
Buatkan laporan rekap produktivitas harian profesional.

Unit: ${input.unit}
Tanggal: ${input.date}
Total Sales: ${input.totalSales}
Total Visit: ${input.totalVisit}

Format singkat siap kirim Telegram.
`;

    const res = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt,
    });

    return res.text;
  }
);
