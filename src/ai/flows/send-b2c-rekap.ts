'use server';

import { z } from 'zod';

const sendProductivityRekapInputSchema = z.object({
  unit: z.string(),
  totalSales: z.number(),
  totalVisit: z.number(),
  date: z.string(),
});

export async function sendProductivityRekap(
  input: z.infer<typeof sendProductivityRekapInputSchema>
): Promise<string> {
  // AI flow is temporarily disabled to resolve model availability issues.
  const message = `
*Rekap Produktivitas Harian*
*Unit:* ${input.unit}
*Tanggal:* ${input.date}

- *Total Sales/Pekerjaan Selesai:* ${input.totalSales}
- *Total Teknisi Produktif:* ${input.totalVisit}

Laporan ini dibuat secara otomatis. (AI dinonaktifkan)
  `.trim();
  return Promise.resolve(message);
}
