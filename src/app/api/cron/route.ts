
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// This route acts as a health check for the cron API endpoints.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Cron API endpoint is active.",
    available_jobs: [
      "/api/cron/daily-schedule",
      "/api/cron/b2c-rekap",
      "/api/cron/plotting-rekap",
    ],
    note: "Please trigger individual job URLs directly. This root endpoint is for testing purposes."
  });
}
