
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
      // @ts-ignore - specifying model for a prompt is not yet in the SDK
      model: 'gemini-pro',
    });
    return output!;
  }
);
