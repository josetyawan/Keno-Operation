
import { NextRequest, NextResponse } from 'next/server'
import { initializeFirebase } from '@/firebase/init'
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'
import type { RiwayatGangguan } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url)

  const noTiket = searchParams.get('noTiket')
  const noService = searchParams.get('noService')

  if (!noTiket && !noService) {
    return NextResponse.json(
      { success:false, error:'noTiket or noService required' },
      { status:400 }
    )
  }

  try {

    const { firestore } = initializeFirebase()

    const ref = collection(firestore,'riwayat-gangguan')

    let q

    if (noTiket) {

      q = query(
        ref,
        where('noTiket','==',noTiket),
        // orderBy('tanggalLapor','desc'), // Temporarily removed to prevent index error
        limit(1)
      )

    } else {

      q = query(
        ref,
        where('noService','==',noService),
        // Temporarily removed to prevent index error. This may not return the absolute latest record if duplicates exist.
        // orderBy('tanggalLapor','desc'), 
        limit(1)
      )

    }

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

    console.error('API gangguan error', e)

    return NextResponse.json(
      { close:false, error:'internal_error' },
      { status:500 }
    )

  }

}
