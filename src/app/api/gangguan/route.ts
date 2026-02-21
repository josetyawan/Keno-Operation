
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { addDoc, collection } from 'firebase/firestore';

export async function POST(request: Request) {
    const secretKey = process.env.BOT_SECRET_KEY;

    if (!secretKey) {
        console.error("API Error: BOT_SECRET_KEY environment variable is not set on the server.");
        // Selalu kembalikan JSON, bukan HTML
        return NextResponse.json({ success: false, error: 'Server configuration error: Missing secret key.' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const expectedAuthHeader = `Bearer ${secretKey}`;

    if (authHeader !== expectedAuthHeader) {
        console.warn(`Unauthorized access attempt. Provided header: ${authHeader}`);
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid secret key provided.' }, { status: 401 });
    }

    try {
        const { firestore } = initializeFirebase();
        const body = await request.json();

        if (!body.no_service || !body.keterangan) {
            return NextResponse.json({ success: false, error: 'Data tidak lengkap. Field no_service dan keterangan wajib diisi.' }, { status: 400 });
        }
        
        const riwayatCollection = collection(firestore, 'riwayat-gangguan');
        
        // PERBAIKAN: Menggunakan new Date() untuk stempel waktu di sisi server
        const newRiwayatData = {
            noService: body.no_service || '',
            tanggalLapor: new Date(),
            noTiket: body.no_tiket || '',
            teknisi: body.teknisi || '',
            keterangan: body.keterangan || '',
            pelangganId: '',
        };

        await addDoc(riwayatCollection, newRiwayatData);

        return NextResponse.json({ success: true, message: 'Data riwayat gangguan berhasil disimpan.' });
    } catch (error: any) {
        console.error('API Error in /api/gangguan:', error);
        
        // PERBAIKAN: Memastikan respons galat selalu dalam format JSON
        const errorMessage = error.message || 'An unknown server error occurred.';
        return NextResponse.json({ success: false, error: `Server-side API error: ${errorMessage}` }, { status: 500 });
    }
}
