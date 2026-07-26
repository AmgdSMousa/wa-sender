import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWAClient } from '@/lib/whatsapp/client';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const campaignId = parseInt(params.id);

    // Get failed contacts only
    const failedContacts = await prisma.campaignContact.findMany({
      where: { campaignId, status: 'failed' },
      include: { contact: true, campaign: true },
    });

    if (failedContacts.length === 0) {
      return NextResponse.json({ message: 'لا توجد رسائل فاشلة لإعادة إرسالها' });
    }

    const client = getWAClient();
    if (!client) {
      return NextResponse.json({ error: 'واتساب غير متصل' }, { status: 400 });
    }

    // Reset failed to pending
    await prisma.campaignContact.updateMany({
      where: { campaignId, status: 'failed' },
      data: { status: 'pending', error: null },
    });

    // Update campaign status to running
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'running' },
    });

    // Re-send in background
    (async () => {
      const campaign = failedContacts[0].campaign;
      for (const cc of failedContacts) {
        try {
          const phone = `${cc.contact.phone}@c.us`;
          await client.sendMessage(phone, campaign.message);
          await prisma.campaignContact.update({
            where: { id: cc.id },
            data: { status: 'sent', sentAt: new Date(), error: null },
          });
        } catch (err: any) {
          await prisma.campaignContact.update({
            where: { id: cc.id },
            data: { status: 'failed', error: err.message },
          });
        }
        // Delay between messages
        const delay = Math.floor(Math.random() * (campaign.maxDelay - campaign.minDelay + 1) + campaign.minDelay);
        await new Promise(r => setTimeout(r, delay * 1000));
      }
      // Check if all done
      const remaining = await prisma.campaignContact.count({ where: { campaignId, status: 'pending' } });
      if (remaining === 0) {
        await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'completed' } });
      }
    })();

    return NextResponse.json({ success: true, retrying: failedContacts.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
