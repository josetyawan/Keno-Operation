import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    const expectedAuthHeader = `Bearer ${process.env.BOT_SECRET_KEY}`;

    if (!process.env.BOT_SECRET_KEY || authHeader !== expectedAuthHeader) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { firestore } = initializeFirebase();
        const body = await request.json();

        // Basic validation
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

        return NextResponse.json({ success: true, message: 'Data riwayat gangguan berhasil disimpan.' });
    } catch (error: any) {
        console.error('API Error in /api/gangguan:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
