
'use server';

import { collection, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import type { RiwayatGangguan } from '@/lib/types';
import { isValid, parse } from 'date-fns';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEB_APP_URL;

export async function fetchFromSheet(): Promise<{ success: boolean; message: string; count: number }> {
    if (!APPS_SCRIPT_URL) {
        return { success: false, message: 'URL Apps Script belum diatur di file .env server.', count: 0 };
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'GET',
            redirect: 'manual', // Penting: jangan ikuti redirect secara otomatis
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location && location.includes('accounts.google.com')) {
                return {
                    success: false,
                    message: 'Terjadi pengalihan ke halaman login Google. Ini biasanya berarti izin "Who has access" di Apps Script belum diatur ke "Anyone". Pastikan juga Anda sudah membuat "versi baru" setelah mengubah izin.',
                    count: 0,
                };
            }
        }
        
        const responseText = await response.text();
        if (!response.ok) {
            return { success: false, message: `Gagal mengambil data dari Google Sheet. Status: ${response.status}. Respons: ${responseText}`, count: 0 };
        }

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
        
        // Ambil semua tiket yang ada untuk menghindari duplikasi
        const existingTicketsSnapshot = await getDocs(query(riwayatCollection, where('noTiket', '!=', '')));
        const existingTicketNumbers = new Set(existingTicketsSnapshot.docs.map(doc => doc.data().noTiket));

        for (const item of data) {
             if (item['No Tiket'] && existingTicketNumbers.has(item['No Tiket'])) {
                continue; // Lewati jika tiket sudah ada
            }

            // Coba parsing tanggal dengan berbagai format
            let tanggalLapor: Date | null = null;
            if (item['Tanggal Lapor']) {
                 const dateString = item['Tanggal Lapor'];
                 // Coba format 'dd/MM/yyyy HH:mm:ss'
                 let parsedDate = parse(dateString, 'dd/MM/yyyy HH:mm:ss', new Date());
                 if (!isValid(parsedDate)) {
                     // Coba format ISO atau format standar lainnya
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

            // Hanya tambahkan jika noService ada
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
        return { success: false, message: `Terjadi kesalahan saat proses sinkronisasi: ${error.message}`, count: 0 };
    }
}
