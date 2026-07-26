import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');

  try {
    const contacts = await prisma.contact.findMany({
      where: {
        AND: [
          tag ? { tags: { contains: tag } } : {},
          search ? {
            OR: [
              { phone: { contains: search } },
              { name: { contains: search } },
              { tags: { contains: search } }
            ]
          } : {}
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contacts } = body; // Array of { phone, name, tags, metadata }

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: 'Invalid contacts data' }, { status: 400 });
    }

    // 1. Clean and deduplicate batch contacts by clean digits-only phone number
    const uniqueBatchMap = new Map<string, any>();
    contacts.forEach(c => {
      if (c && c.phone) {
        const cleanPhone = String(c.phone).trim().replace(/[^0-9]/g, '');
        if (cleanPhone && !uniqueBatchMap.has(cleanPhone)) {
          uniqueBatchMap.set(cleanPhone, { ...c, phone: cleanPhone });
        }
      }
    });
    const deduplicatedContacts = Array.from(uniqueBatchMap.values());

    if (deduplicatedContacts.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 2. Perform safe upsert for every contact (no P2002 createMany errors possible)
    let savedCount = 0;
    for (const c of deduplicatedContacts) {
      try {
        await prisma.contact.upsert({
          where: { phone: c.phone },
          update: {
            ...(c.name ? { name: c.name } : {}),
            ...(c.tags ? { tags: c.tags } : {}),
            ...(c.metadata ? { metadata: c.metadata } : {}),
          },
          create: {
            phone: c.phone,
            name: c.name || null,
            tags: c.tags || null,
            metadata: c.metadata || null,
            source: c.source || 'crm_manual'
          }
        });
        savedCount++;
      } catch (upsertErr) {
        console.warn(`Safe upsert skip for contact ${c.phone}:`, upsertErr);
      }
    }

    return NextResponse.json({ success: true, count: savedCount });
  } catch (error: any) {
    console.error('API Contact Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
