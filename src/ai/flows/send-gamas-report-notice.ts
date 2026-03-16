'use server';

import { z } from 'zod';

const gamasReportNoticeSchema = z.object({
  userName: z.string(),
  noTiket: z.string(),
  status: z.string(),
  rejectionReason: z.string().optional(),
});

export async function sendGamasReportNotice(
  input: z.infer<typeof gamasReportNoticeSchema>
): Promise<string> {
  // AI flow is temporarily disabled to resolve model availability issues.
  const emoji = input.status === 'Disetujui' ? '✅' : '❌';
  let message = `
${emoji} *Status Laporan Gamas Diperbarui*

- *No. Tiket:* ${input.noTiket}
- *Teknisi:* ${input.userName}
- *Status Baru:* ${input.status}
  `.trim();
  
  if (input.rejectionReason) {
    message += `\n- *Alasan Penolakan:* ${input.rejectionReason}`;
  }
  
  message += `\n\n(AI dinonaktifkan)`;
  
  return Promise.resolve(message);
}
