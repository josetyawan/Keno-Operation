import { NextRequest, NextResponse } from 'next/server'
import { initializeFirebase } from '@/firebase/init'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import type { RiwayatGangguan } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {

  try {

    const { searchParams } = new URL(request.url)

    const noTiket = searchParams.get('noTiket')
    const noService = searchParams.get('noService')

    if (!noTiket && !noService) {
      return NextResponse.json(
        { success:false, error:'noTiket or noService required' },
        { status:400 }
      )
    }

    const fb = initializeFirebase()

    if (!fb || !fb.firestore) {
      console.error('Firestore not initialized')
      return NextResponse.json(
        { close:false, error:'firestore_not_ready' },
        { status:500 }
      )
    }

    const ref = collection(fb.firestore,'riwayat-gangguan')

    const q = noTiket
      ? query(ref, where('noTiket','==',noTiket), limit(1))
      : query(ref, where('noService','==',noService), limit(1))

    const snap = await getDocs(q)

    if (snap.empty) {
      return NextResponse.json({ close:false })
    }

    const ticket = snap.docs[0].data() as RiwayatGangguan

    if (ticket.tanggalClose) {
      return NextResponse.json({
        close:true,
        teknisi: ticket.namaPetugas || null,
        action: ticket.keterangan || null
      })
    }

    return NextResponse.json({ close:false })

  } catch(e) {

    console.error('API gangguan fatal', e)

    return NextResponse.json(
      { close:false, error:'internal_error' },
      { status:500 }
    )

  }

}
