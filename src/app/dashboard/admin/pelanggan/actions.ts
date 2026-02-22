
'use server';

import { collection, writeBatch, getDocs, query, where, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import type { RiwayatGangguan } from '@/lib/types';
import { isValid, parse } from 'date-fns';

export async function fetchFromSheet(url: string): Promise<{ success: boolean; message: string; count: number }> {
    if (!url) {
        return { success: false, message: 'URL Apps Script belum diatur.', count: 0 };
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'manual', // Do not follow redirects automatically
        });

        // 1. Specifically handle redirects (status 3xx)
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            // Check if it's a redirect to Google's login/auth page
            if (location && location.includes('accounts.google.com')) {
                return {
                    success: false,
                    message: 'Terjadi pengalihan ke halaman login Google. Ini biasanya berarti izin "Who has access" di Apps Script belum diatur ke "Anyone". Pastikan juga Anda sudah membuat "versi baru" setelah mengubah izin.',
                    count: 0,
                };
            }
            // For other redirects, show a generic but informative message
            return {
                success: false,
                message: `Apps Script merespons dengan pengalihan (Status: ${response.status}). URL tujuan: ${location}`,
                count: 0,
            };
        }

        // 2. Handle other non-successful responses (4xx, 5xx)
        if (!response.ok) {
            const responseText = await response.text();
            return { 
                success: false, 
                message: `Gagal mengambil data. Status: ${response.status}. Respons dari server: ${responseText.substring(0, 200)}`, 
                count: 0 
            };
        }
        
        // 3. If response is OK, try to parse JSON
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
             return {
                success: false,
                message: `Format respons dari Apps Script bukan JSON yang valid. Ini kemungkinan karena kesalahan izin atau galat di dalam skrip. Respons yang diterima: ${responseText.substring(0, 100)}...`,
                count: 0,
            };
        }
        
        if (data.error) {
            return { success: false, message: `Galat dari Apps Script: ${data.message}`, count: 0 };
        }
        
        if (!Array.isArray(data)) {
            return { success: false, message: `Format data dari Google Sheet tidak valid (bukan array).`, count: 0 };
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
        console.error("Error in fetchFromSheet:", error);
         if (error.name === 'AbortError' || error.name === 'FetchError' || error.code === 'UND_ERR_CONNECT_TIMEOUT') {
             return { success: false, message: `Kesalahan Jaringan: Tidak dapat terhubung ke server Apps Script. Periksa koneksi internet Anda.`, count: 0 };
        }
        return { success: false, message: `Terjadi kesalahan pada aplikasi saat proses sinkronisasi: ${error.message}`, count: 0 };
    }
}
