
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

// IMPORTANT: This line forces the route to be dynamic, preventing caching issues.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const secretKey = process.env.BOT_SECRET_KEY;

    if (!secretKey) {
        console.error("API Error: BOT_SECRET_KEY environment variable is not set on the server.");
        // Return plain text for errors to avoid Telegram parsing issues
        return new NextResponse('Server configuration error: Missing secret key.', { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const expectedAuthHeader = `Bearer ${secretKey}`;

    if (authHeader !== expectedAuthHeader) {
        console.warn(`Unauthorized access attempt.`);
        // Return plain text for errors
        return new NextResponse('Unauthorized: Invalid secret key provided.', { status: 401 });
    }

    try {
        // Initialize Firebase services *inside* the handler, which is the correct pattern.
        const { firestore } = initializeFirebase();
        
        const body = await request.json();

        if (!body.no_service || !body.keterangan) {
            // Return JSON on validation error, as this is a controlled failure
            return NextResponse.json({ success: false, error: 'Data tidak lengkap. Field no_service dan keterangan wajib diisi.' }, { status: 400 });
        }
        
        const riwayatCollection = collection(firestore, 'riwayat-gangguan');
        
        const newRiwayatData = {
            noService: body.no_service || '',
            tanggalLapor: Timestamp.now(), // Use Firestore Timestamp for consistency
            noTiket: body.no_tiket || '',
            teknisi: body.teknisi || '',
            keterangan: body.keterangan || '',
            pelangganId: '', // Default empty as per previous logic
        };

        await addDoc(riwayatCollection, newRiwayatData);

        // If successful, send a clear JSON success response
        return NextResponse.json({ success: true, message: 'Data riwayat gangguan berhasil disimpan.' });

    } catch (error: any) {
        // If any other error occurs (e.g., invalid JSON), report it correctly.
        console.error('API Error in /api/gangguan:', error);
        
        const errorMessage = error.message || 'An unknown server error occurred.';
        // Return plain text for unexpected server errors
        return new NextResponse(`Server-side API error: ${errorMessage}`, { status: 500 });
    }
}
