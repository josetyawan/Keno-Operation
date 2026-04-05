
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // This is a simplified health check. The real logic will be re-added later.
  return NextResponse.json({ status: 'ok', job: 'b2c-rekap' });
}
