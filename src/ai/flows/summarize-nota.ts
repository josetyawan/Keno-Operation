
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const summarizeInputSchema = z.object({
  notaContent: z.string(),
});

const summarizeOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the provided nota content.'),
});

const summarizeNotaFlow = ai.defineFlow(
  {
    name: 'summarizeNotaFlow',
    inputSchema: summarizeInputSchema,
    outputSchema: summarizeOutputSchema,
  },
  async ({ notaContent }) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Ringkas konten nota berikut menjadi satu paragraf singkat yang informatif:

      ---
      ${notaContent}
      ---
      `,
      output: {
        format: 'json',
        schema: summarizeOutputSchema,
      },
    });
    return output!;
  }
);

export async function summarizeNota(
  input: z.infer<typeof summarizeInputSchema>
): Promise<z.infer<typeof summarizeOutputSchema>> {
  return summarizeNotaFlow(input);
}
