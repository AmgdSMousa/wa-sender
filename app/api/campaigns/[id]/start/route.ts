import { NextResponse } from 'next/server';
import { runCampaign } from '@/lib/whatsapp/campaign-runner';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Run campaign directly in background without waiting for Redis queue or blocking HTTP response
    runCampaign(id).catch((err) => console.error('Direct runCampaign error:', err));
    
    return NextResponse.json({ success: true, message: 'تم بدء الحملة بنجاح' });
  } catch (error: any) {
    console.error('Start campaign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
