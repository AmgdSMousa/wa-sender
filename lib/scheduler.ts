import cron from 'node-cron';
import { prisma } from './prisma';
import { PrismaClient } from '@prisma/client';
import { runCampaign } from './whatsapp/campaign-runner';
import { getWAClient } from './whatsapp/client';

const dripPrisma = new PrismaClient();

export const initScheduler = () => {
  console.log('Scheduler initialized');
  
  // Check for scheduled campaigns every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    const campaignsToStart = await prisma.campaign.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
      select: { id: true },
    });

    for (const campaign of campaignsToStart) {
      console.log(`Starting scheduled campaign: ${campaign.id}`);
      runCampaign(campaign.id);
    }
  });

  // ─── Drip Campaign Scheduler (every hour) ────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    console.log('[Drip Scheduler] Running drip step check...');
    const now = new Date();

    const dripCampaigns = await (dripPrisma.campaign as any).findMany({
      where: { isDrip: true, status: { in: ['running', 'draft'] } },
      include: { contacts: { include: { contact: true } } },
    });

    for (const campaign of dripCampaigns) {
      if (!campaign.sequenceSteps) continue;
      let steps: { message: string; delayDays: number }[];
      try { steps = JSON.parse(campaign.sequenceSteps); } catch { continue; }

      const client = getWAClient(campaign.sessionId || 'default');
      if (!client) { console.log(`[Drip] No client for session ${campaign.sessionId}`); continue; }

      for (const cc of campaign.contacts) {
        const stepsDone = cc.ackStatus || 0;
        if (stepsDone >= steps.length) continue;

        const step = steps[stepsDone];
        const campaignStart = new Date(campaign.createdAt);
        const totalDelayMs = steps.slice(0, stepsDone + 1).reduce((s: number, x: any) => s + x.delayDays * 86400000, 0);
        const sendAt = new Date(campaignStart.getTime() + totalDelayMs);
        if (now < sendAt) continue;

        try {
          const phone = cc.contact.phone;
          const msg = step.message.replace(/{name}/g, cc.contact.name || phone);
          await client.sendMessage(`${phone}@c.us`, msg);
          await dripPrisma.campaignContact.update({
            where: { id: cc.id },
            data: { ackStatus: stepsDone + 1, status: stepsDone + 1 >= steps.length ? 'sent' : 'pending' },
          });
          console.log(`[Drip] ✅ Sent step ${stepsDone + 1}/${steps.length} to ${phone} (Campaign: ${campaign.name})`);
          await new Promise(r => setTimeout(r, (campaign.minDelay || 3) * 1000));
        } catch (e) {
          console.error(`[Drip] ❌ Error sending to ${cc.contact.phone}:`, e);
        }
      }

      const allDone = campaign.contacts.every((cc: any) => (cc.ackStatus || 0) >= steps.length);
      if (allDone) {
        await (dripPrisma.campaign as any).update({ where: { id: campaign.id }, data: { status: 'completed' } });
        console.log(`[Drip] Campaign "${campaign.name}" completed all steps.`);
      } else if (campaign.status === 'draft') {
        await (dripPrisma.campaign as any).update({ where: { id: campaign.id }, data: { status: 'running' } });
      }
    }
  });

  // Re-start 'running' regular campaigns after server restart
  const checkRunning = async () => {
    const runningCampaigns = await prisma.campaign.findMany({
      where: { status: 'running', isDrip: false } as any,
      select: { id: true },
    });
    for (const campaign of runningCampaigns) {
      console.log(`Resuming running campaign: ${campaign.id}`);
      runCampaign(campaign.id);
    }
  };

  checkRunning();
};
