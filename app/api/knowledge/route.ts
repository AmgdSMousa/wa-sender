import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const files = await prisma.knowledgeFile.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(files);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch knowledge base' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { fileName, content } = await req.json();
    if (!fileName || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const newKb = await prisma.knowledgeFile.create({
      data: { fileName, content }
    });

    return NextResponse.json(newKb);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add knowledge base' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.knowledgeFile.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete knowledge base' }, { status: 500 });
  }
}
