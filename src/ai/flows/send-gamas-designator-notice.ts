'use server';

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
  // AI flow is temporarily disabled to resolve model availability issues.
  const message = `
⚠️ *Perbaikan Eviden Gamas Diperlukan*

- *No. Tiket:* ${input.noTiket}
- *Teknisi:* ${input.userName}
- *Designator Ditolak:* ${input.designator}
- *Alasan:* ${input.rejectionReason}

Mohon untuk segera diperbaiki. (AI dinonaktifkan)
  `.trim();
  return Promise.resolve(message);
}
