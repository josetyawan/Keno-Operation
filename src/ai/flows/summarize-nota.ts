'use server';

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
  // AI flow is temporarily disabled to resolve model availability issues.
  return Promise.resolve({ summary: "Fitur ringkasan AI dinonaktifkan untuk sementara." });
}
