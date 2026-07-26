import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getWAClient } from '@/lib/whatsapp/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * Drip Campaign Scheduler
 * Called by: GET /api/drip/scheduler
 * 
 * This endpoint checks for drip campaigns and sends pending sequence steps.
 * Set up a cron job to call this every hour:
 *   curl http://localhost:3001/api/drip/scheduler
 * Or use Vercel Cron / an external scheduler.
 */
export async function GET() {
  try {
    const now = new Date();
    let totalSent = 0;
    let errors = 0;

    // Find all drip campaigns that are not completed/paused
    const dripCampaigns = await (prisma.campaign as any).findMany({
      where: {
        isDrip: true,
        status: { in: ['running', 'draft'] },
      },
      include: {
        contacts: {
          include: { contact: true },
        },
      },
    });

    for (const campaign of dripCampaigns) {
      if (!campaign.sequenceSteps) continue;

      let steps: { message: string; delayDays: number }[];
      try {
        steps = JSON.parse(campaign.sequenceSteps);
      } catch {
        continue;
      }

      const client = getWAClient(campaign.sessionId || 'default');
      if (!client) continue;

      for (const cc of campaign.contacts) {
        // Determine which step this contact should receive next
        // We use ackStatus as step index marker (0 = not started, 1+ = steps done)
        const stepsDone = cc.ackStatus || 0;
        const nextStepIdx = stepsDone;
        if (nextStepIdx >= steps.length) continue; // All steps sent

        const step = steps[nextStepIdx];
        
        // Calculate when this step should be sent
        const campaignStart = new Date(campaign.createdAt);
        const totalDelayMs = steps.slice(0, nextStepIdx + 1).reduce((sum: number, s: any) => sum + s.delayDays * 86400000, 0);
        const sendAt = new Date(campaignStart.getTime() + totalDelayMs);

        if (now < sendAt) continue; // Not time yet

        // Send the message
        try {
          const phone = cc.contact.phone;
          const chatId = `${phone}@c.us`;
          const personalizedMsg = step.message.replace(/{name}/g, cc.contact.name || phone);
          
          await client.sendMessage(chatId, personalizedMsg);

          // Mark step as done (increment ackStatus)
          await prisma.campaignContact.update({
            where: { id: cc.id },
            data: {
              ackStatus: stepsDone + 1,
              status: nextStepIdx + 1 >= steps.length ? 'sent' : 'pending',
              sentAt: nextStepIdx === 0 ? now : cc.sentAt,
            },
          });

          totalSent++;
          await new Promise(r => setTimeout(r, (campaign.minDelay || 3) * 1000));
        } catch (e) {
          errors++;
          await prisma.campaignContact.update({
            where: { id: cc.id },
            data: { error: String(e) },
          });
        }
      }

      // Check if all contacts finished all steps → mark campaign complete
      const allDone = campaign.contacts.every((cc: any) =>
        (cc.ackStatus || 0) >= steps.length
      );
      if (allDone) {
        await (prisma.campaign as any).update({
          where: { id: campaign.id },
          data: { status: 'completed' },
        });
      } else if (campaign.status === 'draft') {
        await (prisma.campaign as any).update({
          where: { id: campaign.id },
          data: { status: 'running' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: dripCampaigns.length,
      sent: totalSent,
      errors,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
