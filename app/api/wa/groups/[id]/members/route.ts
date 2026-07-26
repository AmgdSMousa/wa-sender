import { NextResponse } from 'next/server';
import { getWAClient } from '@/lib/whatsapp/client';
import { GroupChat } from 'whatsapp-web.js';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const client = getWAClient();
    
    if (!client) {
      return NextResponse.json({ error: 'WhatsApp client not initialized' }, { status: 400 });
    }

    const chat = await client.getChatById(id) as GroupChat;
    
    if (!chat.isGroup) {
      return NextResponse.json({ error: 'Chat is not a group' }, { status: 400 });
    }

    const participants = chat.participants.map(p => ({
      id: p.id._serialized,
      phone: p.id.user,
      isAdmin: p.isAdmin,
      isSuperAdmin: p.isSuperAdmin,
    }));

    return NextResponse.json({
      id: chat.id._serialized,
      name: chat.name,
      participants
    });
  } catch (error: any) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
