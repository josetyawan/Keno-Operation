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
    const combinedMessage = input.rekapMessages.join('\n\n---\n\n');
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Anda adalah asisten yang bertugas membuat laporan rekap harian untuk dikirim ke Telegram.
      Berikut adalah data rekap yang sudah digabungkan dari beberapa unit:
      ---
      ${combinedMessage}
      ---
      
      Tugas Anda:
      1. Beri judul laporan: "*Laporan Rekap Harian Otomatis*"
      2. Gabungkan semua pesan di atas menjadi satu laporan yang koheren.
      3. Jika ada lampiran foto (jumlah: ${input.photos.length}), tambahkan catatan di akhir laporan yang menyebutkan jumlah foto dan judulnya ("${input.photoCaption || 'Lampiran Foto'}").
      4. Gunakan format Markdown.`,
    });
    return text;
  }
);

export async function sendDailyRekapReport(
  input: z.infer<typeof dailyRekapInputSchema>
): Promise<string> {
  return sendDailyRekapReportFlow(input);
}
