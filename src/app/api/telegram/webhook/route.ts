
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const message = body.message;

        // Ensure there is a message with text
        if (!message || !message.text) {
            return NextResponse.json({ ok: true, message: "No text message received." });
        }

        const text: string = message.text;

        // This is a simple parsing logic. It can be adjusted.
        // Example format: /gangguan NS:12345 Tiket:INC987 Teknisi:Budi Ket:Kabel putus
        const noServiceMatch = text.match(/NS:(\S+)/i);
        const noTiketMatch = text.match(/Tiket:(\S+)/i);
        const teknisiMatch = text.match(/Teknisi:(\S+)/i);
        const keteranganMatch = text.match(/Ket:(.+)/i);

        const riwayatData = {
            noService: noServiceMatch ? noServiceMatch[1].trim() : '',
            noTiket: noTiketMatch ? noTiketMatch[1].trim() : '',
            namaPetugas: teknisiMatch ? teknisiMatch[1].trim() : '',
            keterangan: keteranganMatch ? keteranganMatch[1].trim() : 'Laporan diterima dari bot.',
            tanggalLapor: Timestamp.now(),
            sumber: 'Telegram Bot', // Add a source field
        };

        // Only save if we have at least a service number or ticket number
        if (riwayatData.noService || riwayatData.noTiket) {
            const { firestore } = initializeFirebase();
            await addDoc(collection(firestore, 'riwayat-gangguan'), riwayatData);
             return NextResponse.json({ ok: true, message: "Data saved to Firestore." });
        }

        return NextResponse.json({ ok: true, message: "Message received, but no data to save." });
    } catch (error: any) {
        console.error('Error processing Telegram webhook:', error.message);
        // Don't send detailed error back to Telegram for security
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
