import { NextResponse } from 'next/server';
import { getWAClient } from '@/lib/whatsapp/client';
import { prisma } from '@/lib/prisma';
import { GroupChat } from 'whatsapp-web.js';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { groupName } = await req.json();
    const client = getWAClient();
    
    if (!client) {
      return NextResponse.json({ success: false, error: 'WhatsApp client not initialized' }, { status: 400 });
    }

    const chat = await client.getChatById(id) as GroupChat;
    
    if (!chat.isGroup) {
      return NextResponse.json({ success: false, error: 'Chat is not a group' }, { status: 400 });
    }

    const participants = chat.participants;
    let savedCount = 0;

    // Process in batches or one by one
    for (const p of participants) {
      const phone = p.id.user;
      
      try {
        await prisma.contact.upsert({
          where: { phone },
          update: {
            groupId: id,
            source: 'group',
            tags: (groupName ? `${groupName}, Group` : 'Group')
          },
          create: {
            phone,
            groupId: id,
            source: 'group',
            tags: (groupName ? `${groupName}, Group` : 'Group')
          }
        });
        savedCount++;
      } catch (e) {
        console.warn(`Failed to save participant ${phone} from group:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      count: savedCount,
      total: participants.length
    });
  } catch (error: any) {
    console.error('Error saving group members:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
// Prisma Client Trigger
