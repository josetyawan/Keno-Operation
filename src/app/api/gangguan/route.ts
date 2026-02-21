
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, addDoc, collection, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// --- PERBAIKAN UTAMA: Inisialisasi Firebase yang Stabil ---
// Inisialisasi ini hanya berjalan sekali saat server dimulai, bukan di setiap permintaan.
let app: FirebaseApp;
let firestore: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
firestore = getFirestore(app);
// --- AKHIR PERBAIKAN ---

export async function POST(request: Request) {
    // Variabel SECRET KEY diambil dari lingkungan server, ini sudah benar.
    const secretKey = process.env.BOT_SECRET_KEY;

    if (!secretKey) {
        console.error("API Error: BOT_SECRET_KEY environment variable is not set on the server.");
        return NextResponse.json({ success: false, error: 'Server configuration error: Missing secret key.' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const expectedAuthHeader = `Bearer ${secretKey}`;

    if (authHeader !== expectedAuthHeader) {
        console.warn(`Unauthorized access attempt. Provided header: ${authHeader}`);
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid secret key provided.' }, { status: 401 });
    }

    try {
        const body = await request.json();

        if (!body.no_service || !body.keterangan) {
            return NextResponse.json({ success: false, error: 'Data tidak lengkap. Field no_service dan keterangan wajib diisi.' }, { status: 400 });
        }
        
        // Gunakan koneksi Firestore yang sudah stabil
        const riwayatCollection = collection(firestore, 'riwayat-gangguan');
        
        const newRiwayatData = {
            noService: body.no_service || '',
            tanggalLapor: new Date(),
            noTiket: body.no_tiket || '',
            teknisi: body.teknisi || '',
            keterangan: body.keterangan || '',
            pelangganId: '',
        };

        await addDoc(riwayatCollection, newRiwayatData);

        // Jika berhasil, kirim respons sukses
        return NextResponse.json({ success: true, message: 'Data riwayat gangguan berhasil disimpan.' });

    } catch (error: any) {
        // Jika ada galat lain (misal: JSON tidak valid), laporkan dengan benar.
        console.error('API Error in /api/gangguan:', error);
        
        const errorMessage = error.message || 'An unknown server error occurred.';
        return NextResponse.json({ success: false, error: `Server-side API error: ${errorMessage}` }, { status: 500 });
    }
}
