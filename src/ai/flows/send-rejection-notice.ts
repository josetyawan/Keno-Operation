'use server';

import { z } from 'zod';

const rejectionNoticeSchema = z.object({
  picName: z.string(),
  notaDate: z.string(),
  segment: z.string(),
  reason: z.string(),
});

export async function sendRejectionNotice(
  input: z.infer<typeof rejectionNoticeSchema>
): Promise<string> {
  // AI flow is temporarily disabled to resolve model availability issues.
  const message = `
❌ *Laporan Nota Ditolak* ❌

- *PIC:* ${input.picName}
- *Tanggal Nota:* ${input.notaDate}
- *Segmen:* ${input.segment}
- *Alasan Penolakan:* ${input.reason}

Harap periksa detail penolakan di aplikasi, perbaiki laporan Anda, dan kirim ulang untuk verifikasi.
(AI dinonaktifkan)
  `.trim();
  return Promise.resolve(message);
}
