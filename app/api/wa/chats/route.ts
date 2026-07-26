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
    const recentChats = chats
      .filter((chat: any) => !chat.isGroup)
      .map((chat: any) => ({
        id: chat.id._serialized,
        name: chat.name,
        timestamp: chat.timestamp,
        lastMessage: chat.lastMessage ? chat.lastMessage.body : '',
      }))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, 100); // Limit to last 100 for performance

    return NextResponse.json(recentChats);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
