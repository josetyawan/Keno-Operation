
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import type { RiwayatGangguan } from '@/lib/types';

export const dynamic = 'force-dynamic'; // Ensure it's always dynamic

async function getTicketStatus(noTiket?: string | null, noService?: string | null) {
    const { firestore } = initializeFirebase();
    const collectionRef = collection(firestore, 'riwayat-gangguan');

    // Helper to process a snapshot
    const processSnapshot = (snapshot: any) => {
        if (snapshot.empty) {
            return null; // No document found
        }
        const ticketData = snapshot.docs[0].data() as RiwayatGangguan;
        if (ticketData.tanggalClose) {
            return {
                close: true,
                teknisi: ticketData.namaPetugas || null,
                action: ticketData.keterangan || null,
            };
        }
        return { close: false, reason: 'not_closed' };
    };
    
    // Priority 1: Search by noTiket if provided
    if (noTiket) {
        const q = query(collectionRef, where('noTiket', '==', noTiket), orderBy('tanggalLapor', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        const result = processSnapshot(snapshot);
        if (result !== null) { // If a ticket is found (even if not closed), we use this result
            return result;
        }
    }
    
    // Priority 2: If noTiket didn't yield a result, search by noService if provided
    if (noService) {
        const q = query(collectionRef, where('noService', '==', noService), orderBy('tanggalLapor', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        const result = processSnapshot(snapshot);
         if (result !== null) {
            return result;
        }
    }

    // If neither query found anything
    return { close: false, reason: 'not_found' };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const noTiket = searchParams.get('noTiket');
    const noService = searchParams.get('noService');

    if (!noTiket && !noService) {
        return NextResponse.json(
            { success: false, error: 'Query parameter "noTiket" or "noService" is required.' },
            { status: 400 }
        );
    }

    try {
        const status = await getTicketStatus(noTiket, noService);
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

