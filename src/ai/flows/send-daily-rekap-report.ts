'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const dailyRekapInputSchema = z.object({
  rekapMessages: z.array(z.string()),
  photos: z.array(z.string()),
  photoCaption: z.string().optional(),
});

const sendDailyRekapReportFlow = ai.defineFlow(
  {
    name: 'sendDailyRekapReportFlow',
    inputSchema: dailyRekapInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // AI temporarily disabled to ensure app stability.
    // This returns a placeholder message.
    const combinedMessage = input.rekapMessages.join('\n\n---\n\n');
    const message = `
*Laporan Rekap Harian (AI Dinonaktifkan)*

${combinedMessage}

${input.photos.length > 0 ? `Lampiran: ${input.photos.length} foto (${input.photoCaption || ''})` : ''}
    `.trim();
    return message;
  }
);

export async function sendDailyRekapReport(
  input: z.infer<typeof dailyRekapInputSchema>
): Promise<string> {
  return sendDailyRekapReportFlow(input);
}
