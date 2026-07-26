import { NextResponse } from 'next/server';
import { getWAStatus } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    const { status } = getWAStatus(sessionId);
    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
