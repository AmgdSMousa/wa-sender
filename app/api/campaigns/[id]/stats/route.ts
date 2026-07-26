import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const campaignId = parseInt(params.id);
    const contacts = await prisma.campaignContact.findMany({
      where: { campaignId },
      include: { contact: { select: { name: true, phone: true } } },
    });

    const total = contacts.length;
    const sent = contacts.filter(c => c.status === 'sent').length;
    const failed = contacts.filter(c => c.status === 'failed').length;
    const pending = contacts.filter(c => c.status === 'pending').length;
    const delivered = contacts.filter(c => (c as any).ackStatus >= 2).length;
    const read = contacts.filter(c => (c as any).ackStatus >= 3).length;

    return NextResponse.json({
      total, sent, failed, pending, delivered, read,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      contacts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
