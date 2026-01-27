import { NextResponse } from 'next/server';
import { getTodayStats, getRecentLogs } from '@/lib/api-logger';

// Force dynamic to always get fresh data
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = getTodayStats();
    const recentLogs = getRecentLogs(20);

    return NextResponse.json({
      stats,
      recentLogs,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
