import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

export async function POST(request: Request) {
    const secretKey = process.env.BOT_SECRET_KEY;

    // 1. Check if the secret key is configured on the server
    if (!secretKey) {
        console.error("API Error: BOT_SECRET_KEY environment variable is not set on the server.");
        return NextResponse.json({ success: false, error: 'Server configuration error: Missing secret key.' }, { status: 500 });
    }

    // 2. Check the authorization header from the client
    const authHeader = request.headers.get('authorization');
    const expectedAuthHeader = `Bearer ${secretKey}`;

    if (authHeader !== expectedAuthHeader) {
        console.warn(`Unauthorized access attempt. Provided header: ${authHeader}`);
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid secret key provided.' }, { status: 401 });
    }

    try {
        console.log("Received authorized request for /api/gangguan");
        const { firestore } = initializeFirebase();
        const body = await request.json();
        console.log("Request body:", body);

        // 3. Basic validation of the incoming data
        if (!body.no_service || !body.keterangan) {
            return NextResponse.json({ success: false, error: 'Data tidak lengkap. Field no_service dan keterangan wajib diisi.' }, { status: 400 });
        }
        
        const riwayatCollection = collection(firestore, 'riwayat-gangguan');
        
        // Data to be saved, matching the app's 'RiwayatGangguan' type
        const newRiwayatData = {
            noService: body.no_service || '',
            tanggalLapor: Timestamp.now(),
            noTiket: body.no_tiket || '',
            teknisi: body.teknisi || '',
            keterangan: body.keterangan || '',
            pelangganId: '', // This field is optional
        };

        await addDoc(riwayatCollection, newRiwayatData);
        console.log("Successfully saved data to Firestore for no_service:", body.no_service);

        return NextResponse.json({ success: true, message: 'Data riwayat gangguan berhasil disimpan.' });
    } catch (error: any) {
        console.error('API Error in /api/gangguan:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
