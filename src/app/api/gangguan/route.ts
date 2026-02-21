// This API route is no longer used and has been deprecated.
// The new method for writing data from the bot is to use Apps Script with a Service Account
// writing directly to Firestore. See the documentation for more details.
// This file can be safely removed in the future.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json(
        { success: false, error: 'This API endpoint is deprecated and no longer functional.' },
        { status: 410 } // 410 Gone
    );
}
