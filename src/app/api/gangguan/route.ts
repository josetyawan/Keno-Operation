
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

export async function POST(request: Request) {
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
        const { firestore } = initializeFirebase();
        const body = await request.json();

        if (!body.no_service || !body.keterangan) {
            return NextResponse.json({ success: false, error: 'Data tidak lengkap. Field no_service dan keterangan wajib diisi.' }, { status: 400 });
        }
        
        const riwayatCollection = collection(firestore, 'riwayat-gangguan');
        
        const newRiwayatData = {
            noService: body.no_service || '',
            tanggalLapor: Timestamp.now(), // Use Firestore Timestamp for server-side operations
            noTiket: body.no_tiket || '',
            teknisi: body.teknisi || '',
            keterangan: body.keterangan || '',
            pelangganId: '',
        };

        await addDoc(riwayatCollection, newRiwayatData);

        return NextResponse.json({ success: true, message: 'Data riwayat gangguan berhasil disimpan.' });
    } catch (error: any) {
        console.error('API Error in /api/gangguan:', error);
        
        const errorMessage = error.message || 'An unknown server error occurred.';
        // Return a concise JSON error to prevent "message is too long" in the bot
        return NextResponse.json({ success: false, error: `Server-side API error: ${errorMessage}` }, { status: 500 });
    }
}
