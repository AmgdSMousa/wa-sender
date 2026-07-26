import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await prisma.dailyStats.findUnique({
      where: { date: today },
    }) as any;

    // Total contacts
    const totalContacts = await prisma.contact.count({ where: { isBlacklisted: false } });

    // Total campaigns
    const totalCampaigns = await prisma.campaign.count();
    const runningCampaigns = await prisma.campaign.count({ where: { status: 'running' } });

    // Delivery + read rates from today's stats
    const sent = stats?.sent || 0;
    const delivered = stats?.delivered || 0;
    const read = stats?.read || 0;
    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;

    return NextResponse.json({
      sent,
      failed: stats?.failed || 0,
      botReplied: stats?.botReplied || 0,
      aiReplied: stats?.aiReplied || 0,
      delivered,
      read,
      deliveryRate,
      readRate,
      totalContacts,
      totalCampaigns,
      runningCampaigns,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
