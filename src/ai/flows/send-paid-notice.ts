'use server';

import { z } from 'zod';

const rekapDataItemSchema = z.object({
  phone: z.string(),
  name: z.string(),
  segmen: z.string(),
  tanggal: z.string(),
  nominal: z.number(),
  userId: z.string(),
  notaId: z.string().optional(),
});

const sendPaidNoticeInputSchema = z.object({
  paidData: z.array(rekapDataItemSchema),
  grandTotal: z.number(),
  paidDate: z.string(),
});

export async function sendPaidNotice(input: z.infer<typeof sendPaidNoticeInputSchema>): Promise<string> {
  // AI flow is temporarily disabled to resolve model availability issues.
  const rekapString = input.paidData
      .map(
        (item) =>
          `${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal}`
      )
      .join('\n');
      
  const grandTotalFormatted = input.grandTotal.toLocaleString('id-ID');

  const message = `
✅💸 *PEMBAYARAN LUNAS* 💸✅

Tanggal Pembayaran: ${input.paidDate}

Data Terbayar:
${rekapString}

---
*GRAND TOTAL LUNAS: Rp ${grandTotalFormatted}*

Terima kasih atas kerja keras rekan-rekan. Semua laporan terverifikasi pada periode ini telah dibayarkan.
(AI dinonaktifkan)
  `.trim();
  
  return Promise.resolve(message);
}
