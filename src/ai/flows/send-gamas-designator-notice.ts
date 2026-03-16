'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const gamasDesignatorNoticeSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  designator: z.string(),
  rejectionReason: z.string(),
});

const gamasDesignatorNoticeFlow = ai.defineFlow(
  {
    name: 'gamasDesignatorNoticeFlow',
    inputSchema: gamasDesignatorNoticeSchema,
    outputSchema: z.string(),
  },
  async ({ userName, noTiket, designator, rejectionReason }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Buat notifikasi Telegram dalam format Markdown untuk memberitahu teknisi bahwa salah satu eviden gamas mereka ditolak.
      
      Data:
      - Teknisi: ${userName}
      - No. Tiket: ${noTiket}
      - Designator Ditolak: ${designator}
      - Alasan Penolakan: ${rejectionReason}
      
      Gunakan emoji peringatan ⚠️ dan minta teknisi untuk segera memperbaikinya.`,
    });
    return text;
  }
);

export async function sendGamasDesignatorNotice(
  input: z.infer<typeof gamasDesignatorNoticeSchema>
): Promise<string> {
  return gamasDesignatorNoticeFlow(input);
}
