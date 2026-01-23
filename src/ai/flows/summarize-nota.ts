'use server';

/**
 * @fileOverview This file defines a Genkit flow for summarizing long notas using AI.
 *
 * - summarizeNota - A function that takes a long nota as input and returns a summarized version.
 * - SummarizeNotaInput - The input type for the summarizeNota function, which includes the nota content.
 * - SummarizeNotaOutput - The return type for the summarizeNota function, which includes the summarized nota.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeNotaInputSchema = z.object({
  notaContent: z
    .string() 
    .describe('The content of the nota to be summarized.'),
});

export type SummarizeNotaInput = z.infer<typeof SummarizeNotaInputSchema>;

const SummarizeNotaOutputSchema = z.object({
  summary: z
    .string() 
    .describe('The summarized version of the nota.'),
});

export type SummarizeNotaOutput = z.infer<typeof SummarizeNotaOutputSchema>;

export async function summarizeNota(input: SummarizeNotaInput): Promise<SummarizeNotaOutput> {
  return summarizeNotaFlow(input);
}

const summarizeNotaPrompt = ai.definePrompt({
  name: 'summarizeNotaPrompt',
  input: {schema: SummarizeNotaInputSchema},
  output: {schema: SummarizeNotaOutputSchema},
  prompt: `Summarize the following nota content.  Focus on extracting the key points and important information:\n\n{{{notaContent}}}`, 
});

const summarizeNotaFlow = ai.defineFlow(
  {
    name: 'summarizeNotaFlow',
    inputSchema: SummarizeNotaInputSchema,
    outputSchema: SummarizeNotaOutputSchema,
  },
  async input => {
    const {output} = await summarizeNotaPrompt(input);
    return output!;
  }
);
