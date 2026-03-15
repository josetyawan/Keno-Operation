
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const gamasDesignatorNoticeSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  designator: z.string(),
  rejectionReason: z.string(),
});

export async function sendGamasDesignatorNotice(
  input: z.infer<typeof gamasDesignatorNoticeSchema>
): Promise<string> {
  return sendGamasDesignatorNoticeFlow(input);
}

const sendGamasDesignatorNoticeFlow = ai.defineFlow(
  {
    name: 'sendGamasDesignatorNotice',
    inputSchema: gamasDesignatorNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const prompt = `
Buatkan notifikasi singkat untuk penolakan salah satu eviden designator pada laporan Gamas.
Tujuan: Menginformasikan teknisi tentang penolakan spesifik agar bisa diperbaiki.
Format: Siap kirim ke Telegram. Gunakan emoji yang sesuai (misal: ⚠️).

Detail Laporan:
- No. Tiket: ${input.noTiket}
- Teknisi: ${input.userName}
- Designator yang Ditolak: ${input.designator}
- Alasan Penolakan: ${input.rejectionReason}

Buat pesan yang jelas, singkat, dan informatif.
`;

    const res = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
    });

    // In a real implementation, this would call a tool to send the message.
    // For now, we return the generated text.
    return res.text;
  }
);
