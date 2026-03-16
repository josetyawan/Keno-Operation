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
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat laporan rekap produktivitas harian untuk Telegram dalam format Markdown.
      
      Data:
      - Unit: ${input.unit}
      - Tanggal: ${input.date}
      - Total Sales/Pekerjaan Selesai: ${input.totalSales}
      - Total Teknisi Produktif: ${input.totalVisit}

      Gunakan bahasa yang formal dan informatif.`,
    });
    return text;
  }
);

export async function sendProductivityRekap(
  input: z.infer<typeof sendProductivityRekapInputSchema>
): Promise<string> {
  return sendProductivityRekapFlow(input);
}
