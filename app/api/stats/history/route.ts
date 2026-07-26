import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get last 7 days of stats
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Today + 6 previous days
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const stats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Fill in missing dates to ensure we have a full 7-day array
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }

    const formattedStats = last7Days.map(date => {
      const matchingStat = stats.find(
        (s) => new Date(s.date).getTime() === date.getTime()
      );
      
      return {
        name: date.toLocaleDateString('ar-EG', { weekday: 'short' }),
        fullDate: date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
        sent: matchingStat?.sent || 0,
        failed: matchingStat?.failed || 0,
        botReplied: matchingStat?.botReplied || 0,
        aiReplied: matchingStat?.aiReplied || 0,
      };
    });

    return NextResponse.json(formattedStats);
  } catch (error: any) {
    console.error('Error fetching history stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
