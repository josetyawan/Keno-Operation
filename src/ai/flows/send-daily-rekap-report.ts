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

const dailyRekapPrompt = ai.definePrompt({
    name: 'dailyRekapPrompt',
    model: 'googleai/gemini-pro-vision',
    input: { schema: z.object({
        combinedMessage: z.string(),
        hasPhotos: z.boolean(),
        photoCount: z.number(),
        photoCaption: z.string().optional(),
    }) },
    prompt: `
Anda adalah asisten yang bertugas membuat laporan rekap harian untuk dikirim ke grup Telegram.
Format laporan harus profesional, ringkas, dan mudah dibaca.
Gunakan Markdown untuk formatting.

Berikut adalah data rekap yang perlu diformat:
---
{{{combinedMessage}}}
---
{{#if hasPhotos}}
Laporan ini juga memiliki {{{photoCount}}} lampiran foto dengan judul: "{{{photoCaption}}}". Sertakan pemberitahuan tentang foto ini di akhir laporan.
{{/if}}

Buat satu pesan laporan tunggal yang siap kirim.
`,
});

const sendDailyRekapReportFlow = ai.defineFlow(
  {
    name: 'sendDailyRekapReport',
    inputSchema: dailyRekapInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const combinedMessage = input.rekapMessages.join('\n\n---\n\n');
    const hasPhotos = input.photos.length > 0;

    const { output } = await dailyRekapPrompt({
        combinedMessage: combinedMessage,
        hasPhotos: hasPhotos,
        photoCount: input.photos.length,
        photoCaption: input.photoCaption || 'Lampiran Foto',
    });
    
    return output?.text || '';
  }
);
