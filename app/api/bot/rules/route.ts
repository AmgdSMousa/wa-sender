import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rules = await prisma.botRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(rules);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { keyword, reply, matchType, mediaUrl } = await req.json();

    if (!keyword || !reply) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rule = await (prisma.botRule as any).upsert({
      where: { keyword: keyword.trim().toLowerCase() },
      update: { reply, matchType: matchType || 'exact', isActive: true, mediaUrl: mediaUrl || null },
      create: { 
        keyword: keyword.trim().toLowerCase(), 
        reply,
        matchType: matchType || 'exact',
        mediaUrl: mediaUrl || null
      },
    });

    return NextResponse.json(rule);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.botRule.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
