import { NextResponse } from 'next/server';
import { getWAClient } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = getWAClient();
    if (!client) {
      return NextResponse.json({ error: 'WhatsApp client not initialized' }, { status: 400 });
    }

    const chats = await client.getChats();
    const groups = chats
      .filter((chat: any) => chat.isGroup)
      .map((group: any) => ({
        id: group.id._serialized,
        name: group.name,
        unreadCount: group.unreadCount,
        timestamp: group.timestamp,
      }));

    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
