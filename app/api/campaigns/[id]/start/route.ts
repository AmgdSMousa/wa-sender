import { NextResponse } from 'next/server';
import { campaignQueue } from '@/lib/queue/campaignQueue';
import { runCampaign } from '@/lib/whatsapp/campaign-runner';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    try {
      await campaignQueue.add('run-campaign', { campaignId: id }, {
        jobId: `campaign-${id}-${Date.now()}`,
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      });
    } catch (queueErr) {
      console.warn('BullMQ queue connection issue, falling back to direct background execution:', queueErr);
      // Run in background without awaiting so API returns immediately
      runCampaign(id).catch((err) => console.error('Direct runCampaign error:', err));
    }
    
    return NextResponse.json({ success: true, message: 'تم إرسال الحملة إلى طابور المعالجة بنجاح' });
  } catch (error: any) {
    console.error('Start campaign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
