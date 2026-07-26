import { NextResponse } from 'next/server';
import { getWAStatus, getWAClient } from '@/lib/whatsapp/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId parameter is required' }, { status: 400 });
    }
    
    if (force) {
      console.log(`API /api/wa/qr: Force re-initialization requested for ${sessionId}`);
      getWAClient(sessionId, true);
      return NextResponse.json({ status: 'connecting', qr: null });
    }

    const { status, qr } = getWAStatus(sessionId);
    console.log(`API /api/wa/qr responding - Session: ${sessionId}, Status: ${status}, QR: ${!!qr}`);
    
    if (status === 'disconnected') {
      const dbSession = await prisma.wASession.findUnique({ where: { sessionId } });
      if (dbSession) {
        console.log(`API /api/wa/qr: Auto-initiating disconnected client for ${sessionId}`);
        getWAClient(sessionId);
      }
      return NextResponse.json({ status: 'connecting', qr: null });
    }

    return NextResponse.json({ status, qr });
  } catch (error: any) {
    console.error('CRITICAL API /api/wa/qr Error details:', error?.message, error?.stack);
    return NextResponse.json({ error: error?.message || 'Unknown server error' }, { status: 500 });
  }
}
