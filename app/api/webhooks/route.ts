import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const webhooks = await (prisma as any).webhookConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(webhooks.map((w: any) => ({ ...w, secret: w.secret ? '••••••' + w.secret.slice(-4) : null })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, url } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const secret = crypto.randomBytes(24).toString('hex');
    const webhook = await (prisma as any).webhookConfig.create({
      data: {
        name,
        url: url || '',
        events: JSON.stringify(['message.received']),
        secret,
        isActive: true,
      },
    });
    return NextResponse.json({ ...webhook, secret });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await (prisma as any).webhookConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
