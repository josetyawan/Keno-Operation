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
    const combinedMessage = input.rekapMessages.join('\n\n---\n\n');
    const hasPhotos = input.photos.length > 0;

    const prompt = `
Anda adalah asisten yang bertugas membuat laporan rekap harian untuk dikirim ke grup Telegram.
Format laporan harus profesional, ringkas, dan mudah dibaca.
Gunakan Markdown untuk formatting.

Berikut adalah data rekap yang perlu diformat:
---
${combinedMessage}
---
${hasPhotos ? `\nLaporan ini juga memiliki ${input.photos.length} lampiran foto dengan judul: "${input.photoCaption || 'Lampiran Foto'}". Sertakan pemberitahuan tentang foto ini di akhir laporan.` : ''}

Buat satu pesan laporan tunggal yang siap kirim.
`;

    const res = await ai.generate({
      model: 'gemini-1.0-pro',
      prompt: prompt,
    });
    
    // In a real implementation, this would likely call a tool to send the message and photos.
    // For now, we return the generated text.
    return res.text;
  }
);
