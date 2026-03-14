'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const dailyRekapInputSchema = z.object({
  rekapMessages: z.array(z.string()),
  photos: z.array(z.string()),
  photoCaption: z.string().optional(),
});

export async function sendDailyRekapReport(
  input: z.infer<typeof dailyRekapInputSchema>
): Promise<string> {
  return sendDailyRekapReportFlow(input);
}

const sendDailyRekapReportFlow = ai.defineFlow(
  {
    name: 'sendDailyRekapReport',
    inputSchema: dailyRekapInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // This flow currently formats the report.
    // A full implementation would require a tool to send to Telegram.
    const combinedMessage = input.rekapMessages.join('\n\n---\n\n');

    let photoMessage = '';
    if (input.photos.length > 0) {
      photoMessage = `\n\n*${input.photoCaption || 'Lampiran Foto:'}*`;
    }

    const finalReport = combinedMessage + photoMessage;

    // In a real implementation, this would likely call a tool. e.g.:
    // await tools.sendToTelegram({ text: finalReport, photos: input.photos });
    // For now, returning the formatted text is a safe operation that fixes the type error.
    return finalReport;
  }
);
