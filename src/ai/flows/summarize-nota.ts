
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const summarizeInputSchema = z.object({
  notaContent: z.string(),
});

const summarizeOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the provided nota content.'),
});

export async function summarizeNota(
  input: z.infer<typeof summarizeInputSchema>
): Promise<z.infer<typeof summarizeOutputSchema>> {
  return summarizeNotaFlow(input);
}

const summaryPrompt = ai.definePrompt({
  name: 'summaryPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: summarizeInputSchema },
  output: { schema: summarizeOutputSchema },
  prompt: `Summarize the following nota details into a short, easy-to-read paragraph. Extract the key information like who, what, when, and how much.

Nota Details:
---
{{{notaContent}}}
---
`,
});

const summarizeNotaFlow = ai.defineFlow(
  {
    name: 'summarizeNota',
    inputSchema: summarizeInputSchema,
    outputSchema: summarizeOutputSchema,
  },
  async (input) => {
    const { output } = await summaryPrompt({
      ...input,
    });
    return output!;
  }
);
