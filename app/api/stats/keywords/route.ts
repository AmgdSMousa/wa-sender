import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Top keywords by hit count
    const keywords = await prisma.botRule.findMany({
      select: { keyword: true, hitCount: true, matchType: true },
      orderBy: { hitCount: 'desc' },
      take: 10,
    });

    return NextResponse.json(keywords);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
