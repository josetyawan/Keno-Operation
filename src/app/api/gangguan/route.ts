
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { RiwayatGangguan } from '@/lib/types';

export const dynamic = 'force-dynamic'; // Ensure it's always dynamic

async function getTicketStatus(noTiket: string) {
    const { firestore } = initializeFirebase();
    const collectionRef = collection(firestore, 'riwayat-gangguan');
    const q = query(collectionRef, where('noTiket', '==', noTiket), limit(1));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { close: false, reason: 'not_found' };
    }

    const ticketData = snapshot.docs[0].data() as RiwayatGangguan;

    // Check if tanggalClose is present and not null
    if (ticketData.tanggalClose) {
        return {
            close: true,
            teknisi: ticketData.namaPetugas || null,
            action: ticketData.keterangan || null,
        };
    }

    return { close: false, reason: 'not_closed' };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const noTiket = searchParams.get('noTiket');

    if (!noTiket) {
        return NextResponse.json(
            { success: false, error: 'Query parameter "noTiket" is required.' },
            { status: 400 }
        );
    }

    try {
        const status = await getTicketStatus(noTiket);
        return NextResponse.json(status);
    } catch (error: any) {
        console.error('API Error getting ticket status:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}

// The POST function is deprecated but we keep the file structure for clarity.
export async function POST(request: Request) {
    return NextResponse.json(
        { success: false, error: 'This API endpoint is for GET requests to check ticket status.' },
        { status: 405 } // 405 Method Not Allowed
    );
}
