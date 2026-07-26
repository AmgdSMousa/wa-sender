import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { disconnectWA } from '@/lib/whatsapp/client';

export async function GET() {
  try {
    const sessions = await prisma.wASession.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(sessions);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const session = await prisma.wASession.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId, status: 'disconnected' }
    });
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    // Ensure it is disconnected before deletion
    await disconnectWA(sessionId);

    await prisma.wASession.delete({ where: { sessionId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
