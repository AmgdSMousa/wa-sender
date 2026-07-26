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

    let rawContacts: { phone: string; name?: string }[] = Array.isArray(contacts) ? contacts : [];

    if (rawContacts.length === 0 && targetTag) {
      const dbContacts = await prisma.contact.findMany({
        where: {
          isBlacklisted: false,
          tags: { contains: targetTag },
        },
        select: { phone: true, name: true },
      });
      rawContacts = dbContacts.map((c) => ({ phone: c.phone, name: c.name || undefined }));
    }

    // Deduplicate contacts by clean phone number to prevent Prisma P2002 unique constraint errors
    const uniqueContactsMap = new Map<string, { phone: string; name?: string }>();
    for (const c of rawContacts) {
      if (c && c.phone) {
        const cleanPhone = String(c.phone).trim().replace(/[^0-9]/g, '');
        if (cleanPhone && !uniqueContactsMap.has(cleanPhone)) {
          uniqueContactsMap.set(cleanPhone, { phone: cleanPhone, name: c.name });
        }
      }
    }
    const finalContacts = Array.from(uniqueContactsMap.values());
    
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
          create: finalContacts.map((c) => {
            return {
              contact: {
                connectOrCreate: {
                  where: { phone: c.phone },
                  create: {
                    phone: c.phone,
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

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Campaign creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
