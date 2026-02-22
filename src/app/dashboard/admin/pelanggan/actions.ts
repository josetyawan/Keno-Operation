
'use server';

import { collection, writeBatch, getDocs, query, where, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import type { RiwayatGangguan } from '@/lib/types';
import { isValid, parse } from 'date-fns';

export async function syncRiwayatFromSheet(): Promise<{ success: boolean; message: string; count: number }> {
    const url = process.env.APPS_SCRIPT_WEB_APP_URL;

    if (!url) {
        return { success: false, message: 'URL Google Apps Script belum diatur di server.', count: 0 };
    }

    try {
        // Fetch from the server, but do not follow redirects automatically.
        const response = await fetch(url, { redirect: 'manual' });

        // If Google redirects (status 301, 302), it's almost certainly an auth issue on the Apps Script side.
        if (response.status >= 300 && response.status < 400 && response.headers.get('location')?.includes('google.com')) {
             return {
                success: false,
                message: "Terjadi pengalihan ke halaman login Google. Ini biasanya berarti izin 'Who has access' di Apps Script belum diatur ke 'Anyone'. Pastikan juga Anda sudah membuat 'versi baru' setelah mengubah izin.",
                count: 0
            };
        }

        if (!response.ok) {
             const errorText = await response.text();
            // Check if the response is an HTML error page from Google
            if (errorText.toLowerCase().includes('<!doctype html>')) {
                 return {
                    success: false,
                    message: `Google mengirim halaman galat, bukan data. Status: ${response.status}. Periksa kembali URL dan izin deployment Apps Script Anda.`,
                    count: 0
                };
            }
            return {
                success: false,
                message: `Gagal mengambil data dari Google. Server merespons dengan status: ${response.status} ${response.statusText}`,
                count: 0
            };
        }

        const data = await response.json();

        if (data.error) {
            return { success: false, message: `Galat dari skrip Google: ${data.message}`, count: 0 };
        }

        if (!Array.isArray(data)) {
            return { success: false, message: 'Format data dari Google Sheet tidak valid (bukan array).', count: 0 };
        }
        
        if (data.length === 0) {
            return { success: true, message: 'Tidak ada data baru untuk disinkronkan dari Google Sheet.', count: 0 };
        }
        
        const { firestore } = initializeFirebase();
        const batch = writeBatch(firestore);
        const riwayatCollection = collection(firestore, 'riwayat-gangguan');
        let newRecordsCount = 0;
        
        const existingTicketsSnapshot = await getDocs(query(riwayatCollection, where('noTiket', '!=', '')));
        const existingTicketNumbers = new Set(existingTicketsSnapshot.docs.map(doc => doc.data().noTiket));

        for (const item of data) {
             if (item['No Tiket'] && existingTicketNumbers.has(item['No Tiket'])) {
                continue; // Skip if ticket already exists
            }

            let tanggalLapor: Date | null = null;
            if (item['Tanggal Lapor']) {
                 const dateString = item['Tanggal Lapor'];
                 let parsedDate = parse(dateString, 'dd/MM/yyyy HH:mm:ss', new Date());
                 if (!isValid(parsedDate)) {
                     parsedDate = new Date(dateString);
                 }
                 if(isValid(parsedDate)) {
                    tanggalLapor = parsedDate;
                 }
            }

            const newRiwayat: Partial<RiwayatGangguan> = {
                noService: item['No Service'] || '',
                tanggalLapor: tanggalLapor,
                noTiket: item['No Tiket'] || '',
                teknisi: item['Teknisi'] || '',
                keterangan: item['Keterangan'] || '',
            };

            if (newRiwayat.noService) {
                const docRef = doc(riwayatCollection);
                batch.set(docRef, newRiwayat);
                newRecordsCount++;
            }
        }
        
        if (newRecordsCount > 0) {
            await batch.commit();
        }

        return { success: true, message: `Sinkronisasi selesai. ${newRecordsCount} data baru ditambahkan.`, count: newRecordsCount };

    } catch (error: any) {
        console.error("Error in syncRiwayatFromSheet:", error);
        if (error.cause) {
             return { success: false, message: `Kesalahan jaringan pada server: ${error.cause.code}`, count: 0 };
        }
        return { success: false, message: `Terjadi kesalahan pada server saat mengambil data: ${error.message}`, count: 0 };
    }
}
