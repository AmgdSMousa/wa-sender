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

    // SQLite doesn't support skipDuplicates in createMany, so we filter manually
    const phones = contacts.map(c => c.phone);
    const existingContacts = await prisma.contact.findMany({
      where: { phone: { in: phones } },
      select: { phone: true }
    });
    
    const existingPhones = new Set(existingContacts.map(c => c.phone));
    const newContacts = contacts.filter(c => !existingPhones.has(c.phone));

    if (newContacts.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const result = await prisma.contact.createMany({
      data: newContacts.map(c => ({
        phone: c.phone,
        name: c.name || null,
        tags: c.tags || null,
        metadata: c.metadata || null,
        source: c.source || 'crm_manual'
      }))
    });

    return NextResponse.json({ success: true, count: result.count });
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

// Prisma Client Trigger
