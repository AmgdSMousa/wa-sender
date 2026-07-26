import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getWAClient } from '@/lib/whatsapp/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (phone) {
      const messages = await (prisma as any).chatMessage.findMany({
        where: { phone },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      await (prisma as any).chatMessage.updateMany({
        where: { phone, direction: 'in', isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json(messages);
    }

    const conversations = await (prisma as any).chatMessage.findMany({
      distinct: ['phone'],
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { contact: { select: { name: true } } },
    });

    return NextResponse.json(conversations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { phone, message, sessionId = 'default' } = await req.json();
    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
    }

    const client = getWAClient(sessionId);
    if (!client) {
      return NextResponse.json({ error: 'WhatsApp client not connected' }, { status: 503 });
    }

    const chatId = `${phone}@c.us`;
    await client.sendMessage(chatId, message);

    const contact = await prisma.contact.findUnique({ where: { phone } });
    await (prisma as any).chatMessage.create({
      data: {
        phone,
        contactId: contact?.id ?? null,
        direction: 'out',
        body: message,
        sessionId,
        botHandled: false,
        humanMode: true,
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { phone, humanMode } = await req.json();
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

    await (prisma as any).chatMessage.updateMany({
      where: { phone },
      data: { humanMode: !!humanMode },
    });

    return NextResponse.json({ success: true, humanMode: !!humanMode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
