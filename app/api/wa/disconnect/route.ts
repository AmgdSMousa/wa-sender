import { NextResponse } from 'next/server';
import { disconnectWA } from '@/lib/whatsapp/client';

export async function POST(req: Request) {
  try {
    let sessionId = 'default';
    try {
      const body = await req.json();
      if (body.sessionId) sessionId = body.sessionId;
    } catch (e) {}

    await disconnectWA(sessionId);
    return NextResponse.json({ success: true, message: 'Disconnected successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
