import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templates = await (prisma as any).template.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, body, mediaUrl, category } = await req.json();
    if (!name || !body) {
      return NextResponse.json({ error: 'name and body are required' }, { status: 400 });
    }
    const template = await (prisma as any).template.create({
      data: { name, body, mediaUrl: mediaUrl || null, category: category || 'marketing' },
    });
    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await (prisma as any).template.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
