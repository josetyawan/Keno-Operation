// This API route is no longer used.
// The Telegram bot now writes directly to Firestore using a service account.
// This file is kept to avoid breaking changes but can be safely removed in the future.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json(
        { success: false, error: 'This API endpoint is deprecated.' },
        { status: 410 } // 410 Gone
    );
}
