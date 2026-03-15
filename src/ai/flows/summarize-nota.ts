
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
  prompt: `Summarize the following nota details into a short, easy-to-read paragraph. Extract the key information like who, what, when, and how much.

Return the result as a valid JSON object with a single key "summary". For example: {"summary": "Your summary here."}

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
    
    try {
        // The output is a string, so we need to parse it.
        // It might be wrapped in ```json ... ```, so we need to clean that.
        let jsonString = output?.text || '{}';
        const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1];
        }
        const parsed = JSON.parse(jsonString);
        return summarizeOutputSchema.parse(parsed); // Validate with Zod
    } catch (e) {
        console.error("Failed to parse AI summary output as JSON:", e, "Raw output:", output?.text);
        // Fallback in case of parsing error
        return { summary: "AI could not generate a valid summary." };
    }
  }
);
