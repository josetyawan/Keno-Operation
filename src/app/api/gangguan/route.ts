'use client';
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import type { RiwayatGangguan } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
        const { firestore } = initializeFirebase();
        const collectionRef = collection(firestore, 'riwayat-gangguan');
        let q: ReturnType<typeof query> | null = null;

        // Priority 1: Search by noTiket if provided
        if (noTiket) {
            q = query(collectionRef, where('noTiket', '==', noTiket), orderBy('tanggalLapor', 'desc'), limit(1));
        } 
        // Priority 2: If noTiket isn't provided, search by noService
        else if (noService) {
            q = query(collectionRef, where('noService', '==', noService), orderBy('tanggalLapor', 'desc'), limit(1));
        }

        if (!q) {
            // This case is already handled by the initial check, but for safety:
            return NextResponse.json({ close: false, reason: 'no_identifier_provided' });
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ close: false, reason: 'not_found' });
        }

        const ticketData = snapshot.docs[0].data() as RiwayatGangguan;
        
        // A ticket is "close" if it has a `tanggalClose` field that is not null.
        if (ticketData.tanggalClose) {
            return NextResponse.json({
                close: true,
                teknisi: ticketData.namaPetugas || null,
                action: ticketData.keterangan || null,
            });
        }
        
        // The ticket was found but is not yet closed.
        return NextResponse.json({ close: false, reason: 'not_closed' });

    } catch (error: any) {
        console.error('API Error getting ticket status:', error);
        // Avoid sending detailed internal errors to the public API
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
