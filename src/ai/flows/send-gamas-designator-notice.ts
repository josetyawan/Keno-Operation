
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

const gamasDesignatorPrompt = ai.definePrompt({
    name: 'gamasDesignatorNoticePrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: gamasDesignatorNoticeSchema },
    output: { schema: z.string() },
    prompt: `
Buatkan notifikasi singkat untuk penolakan salah satu eviden designator pada laporan Gamas.
Tujuan: Menginformasikan teknisi tentang penolakan spesifik agar bisa diperbaiki.
Format: Siap kirim ke Telegram. Gunakan emoji yang sesuai (misal: ⚠️).

Detail Laporan:
- No. Tiket: {{{noTiket}}}
- Teknisi: {{{userName}}}
- Designator yang Ditolak: {{{designator}}}
- Alasan Penolakan: {{{rejectionReason}}}

Buat pesan yang jelas, singkat, dan informatif.
`
});


const sendGamasDesignatorNoticeFlow = ai.defineFlow(
  {
    name: 'sendGamasDesignatorNotice',
    inputSchema: gamasDesignatorNoticeSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await gamasDesignatorPrompt(input);
    return output!;
  }
);
