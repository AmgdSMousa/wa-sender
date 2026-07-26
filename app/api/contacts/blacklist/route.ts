import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const blacklistedContacts = await prisma.contact.findMany({
      where: { isBlacklisted: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(blacklistedContacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { phone, name, notes } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    const contact = await prisma.contact.upsert({
      where: { phone: cleanPhone },
      update: {
        isBlacklisted: true,
        ...(name ? { name } : {}),
        source: 'manual_blacklist',
      },
      create: {
        phone: cleanPhone,
        name: name || 'رقم موقوف',
        isBlacklisted: true,
        source: 'manual_blacklist',
      },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, phone } = await req.json();

    if (!id && !phone) {
      return NextResponse.json({ error: 'المعرف أو رقم الهاتف مطلوب' }, { status: 400 });
    }

    if (id) {
      await prisma.contact.update({
        where: { id: Number(id) },
        data: { isBlacklisted: false },
      });
    } else if (phone) {
      const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      await prisma.contact.updateMany({
        where: { phone: cleanPhone },
        data: { isBlacklisted: false },
      });
    }

    return NextResponse.json({ success: true, message: 'تم إزالة الرقم من القائمة السوداء بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
