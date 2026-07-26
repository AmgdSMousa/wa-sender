import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getWAStatus } from '@/lib/whatsapp/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendUpdate = async () => {
        try {
          const allSessions = await prisma.wASession.findMany();
          let overallStatus = 'disconnected';
          if (allSessions.length > 0) {
            for (const s of allSessions) {
              const memStatus = getWAStatus(s.sessionId).status;
              const effectiveStatus = memStatus !== 'disconnected' ? memStatus : s.status;
              if (effectiveStatus === 'connected') {
                overallStatus = 'connected';
                break;
              } else if (effectiveStatus === 'connecting' || effectiveStatus === 'qr') {
                overallStatus = effectiveStatus;
              }
            }
          }
          const waStatus = overallStatus;
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // ─── Daily Stats ──────────────────────────────────────────────────────
          const stats = (await prisma.dailyStats.findUnique({ where: { date: today } })) || { 
            sent: 0, failed: 0, botReplied: 0, aiReplied: 0, delivered: 0, read: 0 
          };
          
          // ─── Totals ───────────────────────────────────────────────────────────
          const totalContacts = await prisma.contact.count({ where: { isBlacklisted: false } });
          const blacklisted = await prisma.contact.count({ where: { isBlacklisted: true } });
          const totalCampaigns = await prisma.campaign.count();
          const runningCampaigns = await (prisma as any).campaign.count({ where: { status: 'running' } });
          const draftCampaigns = await (prisma as any).campaign.count({ where: { status: 'draft' } });
          const completedCampaigns = await (prisma as any).campaign.count({ where: { status: { in: ['completed', 'done'] } } });
          const totalTemplates = await (prisma as any).template.count();
          
          // ─── Live Inbox unread ────────────────────────────────────────────────
          const unreadMessages = await (prisma as any).chatMessage.count({ 
            where: { direction: 'in', isRead: false } 
          });
          const humanModeChats = await (prisma as any).chatMessage.count({
            where: { humanMode: true },
          });
          
          // ─── 7-day History ────────────────────────────────────────────────────
          const last7Days = new Date();
          last7Days.setDate(last7Days.getDate() - 7);
          const rawHistory = await prisma.dailyStats.findMany({
            where: { date: { gte: last7Days } },
            orderBy: { date: 'asc' },
          });
          const history = rawHistory.map(day => ({
            name: day.date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }),
            sent: day.sent,
            botReplied: day.botReplied,
            aiReplied: day.aiReplied,
            delivered: day.delivered,
            read: day.read,
            failed: day.failed,
          }));

          // ─── Top Keywords ─────────────────────────────────────────────────────
          const keywords = await prisma.botRule.findMany({
            orderBy: { hitCount: 'desc' },
            take: 7,
            select: { keyword: true, hitCount: true, isActive: true },
          });
          
          // ─── Recent Campaigns ─────────────────────────────────────────────────
          const recentCampaigns = await (prisma as any).campaign.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { 
              id: true, name: true, status: true, createdAt: true,
              isDrip: true,
              _count: { select: { contacts: true } }
            },
          });
          
          // ─── Recent Inbox messages ────────────────────────────────────────────
          const recentInbox = await (prisma as any).chatMessage.findMany({
            where: { direction: 'in' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { contact: { select: { name: true } } },
          });

          // ─── Payload ──────────────────────────────────────────────────────────
          const payload = {
            waStatus,
            stats: { 
              ...stats, 
              totalContacts,
              blacklisted,
              totalCampaigns,
              runningCampaigns,
              draftCampaigns,
              completedCampaigns,
              totalTemplates,
              unreadMessages,
              humanModeChats,
              deliveryRate: stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0,
              readRate: stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0,
              failRate: stats.sent > 0 ? Math.round((stats.failed / stats.sent) * 100) : 0,
            },
            history,
            keywords,
            recentCampaigns,
            recentInbox,
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (err) {
          console.error('SSE send error:', err);
        }
      };

      await sendUpdate();
      const intervalId = setInterval(sendUpdate, 5000);
      req.signal.addEventListener('abort', () => clearInterval(intervalId));
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
