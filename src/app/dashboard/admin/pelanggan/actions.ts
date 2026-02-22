
'use server';

import { collection, writeBatch, getDocs, query, where, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import type { RiwayatGangguan } from '@/lib/types';
import { isValid, parse } from 'date-fns';

/**
 * @deprecated This function is deprecated and no longer functional. The web app sync method is unreliable due to Google's auth redirects. The recommended method is to have the Apps Script bot write directly to Firestore using a Service Account. Please refer to the updated guide in `docs/apps-script-api-guide.js`.
 */
export async function syncRiwayatFromSheet(): Promise<{ success: boolean; message: string; count: number }> {
    return {
        success: false,
        message: 'Metode sinkronisasi ini tidak lagi digunakan. Silakan ikuti panduan baru di docs/apps-script-api-guide.js untuk mengizinkan bot menulis langsung ke Firestore.',
        count: 0
    };
}
