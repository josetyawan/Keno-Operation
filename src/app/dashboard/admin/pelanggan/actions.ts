
'use server';

/**
 * @deprecated This function is deprecated and is no longer used. The feature has been replaced by a direct file upload on the 'Data Pelanggan' page.
 */
export async function syncRiwayatFromSheet(): Promise<{ success: boolean; message: string; count: number }> {
    return {
        success: false,
        message: 'Fungsi ini tidak lagi digunakan. Silakan gunakan fitur "Import Riwayat" untuk mengunggah file Excel.',
        count: 0
    };
}
