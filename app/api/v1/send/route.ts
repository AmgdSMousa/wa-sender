import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWAClient } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';

/**
 * Public API: POST /api/v1/send
 * Headers: x-api-key: <secret>
 * Body: { phone, message, sessionId? }
 * 
 * Can be used from Zapier, n8n, WooCommerce, Shopify, etc.
 */
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    
    // Validate API key against webhook configs (using the secret field)
    const webhooks = await (prisma as any).webhookConfig.findMany({ where: { isActive: true } });
    const validKey = webhooks.some((w: any) => w.secret === apiKey);
    
    // Also allow if there are no webhooks configured yet (open for first setup)
    if (!validKey && webhooks.length > 0) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { phone, message, sessionId = 'default', mediaUrl } = await req.json();
    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;
    
    const client = getWAClient(sessionId);
    if (!client) {
      return NextResponse.json({ error: 'WhatsApp session not connected', session: sessionId }, { status: 503 });
    }

    await client.sendMessage(chatId, message);

    return NextResponse.json({ success: true, phone: cleanPhone, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
