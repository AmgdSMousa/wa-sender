import { NextResponse } from 'next/server';
import { runCampaign } from '@/lib/whatsapp/campaign-runner';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'معرف الحملة غير صحيح' }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'الحملة غير موجودة' }, { status: 404 });
    }
    
    // Run campaign directly in background without waiting for Redis queue or blocking HTTP response
    runCampaign(id).catch((err) => console.error('Direct runCampaign error:', err));
    
    return NextResponse.json({ success: true, message: 'تم بدء الحملة بنجاح' });
  } catch (error: any) {
    console.error('Start campaign error:', error);
    return NextResponse.json({ error: error?.message || 'فشل بدء الحملة' }, { status: 500 });
  }
}
