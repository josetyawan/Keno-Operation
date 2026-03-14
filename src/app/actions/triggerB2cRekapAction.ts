'use server';

import { sendProductivityRekap } from '@/ai/flows/send-b2c-rekap';

interface RekapPayload {
  unit: string;
  totalSales: number;
  totalVisit: number;
}

export async function triggerB2cRekapAction(
  payload: RekapPayload
): Promise<{ success: boolean; message: string }> {
  try {
    if (payload.totalSales === 0 && payload.totalVisit === 0) {
      return { success: true, message: 'Tidak ada data rekap untuk dikirim.' };
    }

    await sendProductivityRekap({
      date: new Date().toISOString(),
      unit: payload.unit,
      totalSales: payload.totalSales,
      totalVisit: payload.totalVisit,
    });

    // jika tidak error berarti sukses
    return {
      success: true,
      message: `Rekap produktivitas untuk unit ${payload.unit} berhasil dikirim.`,
    };
  } catch (error: any) {
    console.error('Error in manual B2C rekap trigger action:', error);
    return { success: false, message: error.message };
  }
}
