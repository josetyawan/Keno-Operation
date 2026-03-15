
'use server';

import { ai, googleAIGenkitPlugin } from '@/ai/genkit';
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

const b2cRekapPrompt = ai.definePrompt(
    {
        name: 'b2cRekapPrompt',
        model: googleAIGenkitPlugin.model('gemini-1.5-flash'),
        input: { schema: sendProductivityRekapInputSchema },
        prompt: `
Buatkan laporan rekap produktivitas harian profesional.

Unit: {{{unit}}}
Tanggal: {{{date}}}
Total Sales: {{{totalSales}}}
Total Visit: {{{totalVisit}}}

Format singkat siap kirim Telegram.
`,
    }
);


const sendProductivityRekapFlow = ai.defineFlow(
  {
    name: 'sendProductivityRekap',
    inputSchema: sendProductivityRekapInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await b2cRekapPrompt({
        ...input,
    });

    return output?.text() || '';
  }
);
