
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // This cron job is deprecated and its functionality has been moved to a manual trigger 
    // on the 'Rekap Produktivitas' page to resolve permission issues.
    return NextResponse.json({ message: 'This cron job is deprecated.' });
}
