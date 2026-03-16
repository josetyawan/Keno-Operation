'use server';

import { z } from 'zod';

const swapApprovalNoticeSchema = z.object({
  requesterName: z.string(),
  replacementName: z.string(),
  swapDate: z.string(),
});

export async function sendSwapApprovalNotice(
  input: z.infer<typeof swapApprovalNoticeSchema>
): Promise<string> {
  // AI flow is temporarily disabled to resolve model availability issues.
  const message = `
✅🤝 *Persetujuan Tukar Jadwal Jaga* 🤝✅

Pertukaran jadwal jaga telah disetujui.

- *Tanggal:* ${input.swapDate}
- *Teknisi Awal:* ${input.requesterName}
- *Teknisi Pengganti:* ${input.replacementName}

Terima kasih kepada ${input.replacementName} atas kesediaannya.
(AI dinonaktifkan)
  `.trim();
  return Promise.resolve(message);
}
