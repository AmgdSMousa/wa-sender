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

    // Reset non-sent contacts in this campaign to 'pending' so they get processed
    await prisma.campaignContact.updateMany({
      where: { campaignId: id, status: { not: 'sent' } },
      data: { status: 'pending', error: null },
    });

    // Update campaign status to running
    await prisma.campaign.update({
      where: { id },
      data: { status: 'running' },
    });

    // Trigger runCampaign on setImmediate so the HTTP response returns in 1ms without Cloudflare 524 timeout
    setImmediate(() => {
      runCampaign(id).catch((err) => console.error('Background runCampaign error:', err));
    });
    
    return NextResponse.json({ success: true, message: 'تم بدء الحملة بنجاح' });
  } catch (error: any) {
    console.error('Start campaign error:', error);
    return NextResponse.json({ error: error?.message || 'فشل بدء الحملة' }, { status: 500 });
  }
}
