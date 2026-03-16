'use server';

import { z } from 'zod';

const dailyRekapInputSchema = z.object({
  rekapMessages: z.array(z.string()),
  photos: z.array(z.string()),
  photoCaption: z.string().optional(),
});

export async function sendDailyRekapReport(
  input: z.infer<typeof dailyRekapInputSchema>
): Promise<string> {
  // AI flow is temporarily disabled to resolve model availability issues.
  const combinedMessage = input.rekapMessages.join('\n\n---\n\n');
  let finalReport = `*Laporan Rekap Harian Otomatis*\n\n${combinedMessage}`;
  
  if (input.photos.length > 0) {
      finalReport += `\n\n*Lampiran:*\nLaporan ini juga memiliki ${input.photos.length} lampiran foto dengan judul: "${input.photoCaption || 'Lampiran Foto'}".`;
  }
  
  return Promise.resolve(finalReport);
}
