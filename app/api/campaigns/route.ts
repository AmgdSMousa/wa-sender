import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runCampaign } from '@/lib/whatsapp/campaign-runner';

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });
    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, message, contacts, targetTag, scheduledAt, mediaUrl, minDelay, maxDelay, batchSize, batchDelay, sessionId, isDrip, sequenceSteps } = data;

    let finalContacts: { phone: string; name?: string }[] = Array.isArray(contacts) ? contacts : [];

    if (finalContacts.length === 0 && targetTag) {
      const dbContacts = await prisma.contact.findMany({
        where: {
          isBlacklisted: false,
          tags: { contains: targetTag },
        },
        select: { phone: true, name: true },
      });
      finalContacts = dbContacts.map((c) => ({ phone: c.phone, name: c.name || undefined }));
    }
    
    if (!name || finalContacts.length === 0) {
      return NextResponse.json({ error: 'الاسم وجهات الاتصال (أو الوسم المحدد) مطلوبان' }, { status: 400 });
    }
    if (!isDrip && !message) {
      return NextResponse.json({ error: 'نص الرسالة مطلوب للحملات الفورية' }, { status: 400 });
    }

    const campaign = await (prisma.campaign as any).create({
      data: {
        sessionId: sessionId || 'default',
        name,
        message: isDrip ? (sequenceSteps?.[0]?.message || '') : message,
        mediaUrl: mediaUrl || null,
        minDelay: minDelay ? Number(minDelay) : 3,
        maxDelay: maxDelay ? Number(maxDelay) : 10,
        batchSize: batchSize ? Number(batchSize) : null,
        batchDelay: batchDelay ? Number(batchDelay) : null,
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isDrip: !!isDrip,
        sequenceSteps: isDrip && sequenceSteps ? JSON.stringify(sequenceSteps) : null,
        contacts: {
          create: finalContacts.map((c: any) => {
            const cleanPhone = String(c.phone || '').trim().replace(/[^0-9]/g, '');
            return {
              contact: {
                connectOrCreate: {
                  where: { phone: cleanPhone },
                  create: {
                    phone: cleanPhone,
                    name: c.name || null,
                    source: 'campaign_upload',
                  },
                },
              },
            };
          }),
        },
      },
    });

    // If not scheduled, start immediately? Or wait for user to click "Start"?
    // Let's assume the user starts it manually from the UI for better control.

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Campaign creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
