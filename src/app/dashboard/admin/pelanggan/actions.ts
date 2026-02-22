
'use server';

import { collection, writeBatch, getDocs, query, where, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import type { RiwayatGangguan } from '@/lib/types';
import { isValid, parse } from 'date-fns';

// New action to save data fetched from the client
export async function saveRiwayat(data: any[]): Promise<{ success: boolean; message: string; count: number }> {
    if (!Array.isArray(data) || data.length === 0) {
        return { success: false, message: 'Tidak ada data untuk disimpan.', count: 0 };
    }

    try {
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
                 // Handle dd/MM/yyyy HH:mm:ss format and potentially others
                 let parsedDate = parse(dateString, 'dd/MM/yyyy HH:mm:ss', new Date());
                 if (!isValid(parsedDate)) {
                     parsedDate = new Date(dateString); // Fallback for ISO strings or other direct formats
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
                const docRef = doc(riwayatCollection); // Auto-generate ID
                batch.set(docRef, newRiwayat);
                newRecordsCount++;
            }
        }
        
        if (newRecordsCount > 0) {
            await batch.commit();
        }

        return { success: true, message: `Sinkronisasi selesai. ${newRecordsCount} data baru ditambahkan.`, count: newRecordsCount };

    } catch (error: any) {
        console.error("Error in saveRiwayat:", error);
        return { success: false, message: `Terjadi kesalahan pada server saat menyimpan data: ${error.message}`, count: 0 };
    }
}
