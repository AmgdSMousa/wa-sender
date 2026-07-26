import { NextResponse } from 'next/server';
import { getWAClient } from '@/lib/whatsapp/client';
import { MessageMedia } from 'whatsapp-web.js';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  try {
    const { phone, message, mediaUrl, sessionId = 'default' } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'الرقم ونص الرسالة مطلوبان للإرسال التجريبي' }, { status: 400 });
    }

    const client = getWAClient(sessionId);
    if (!client) {
      return NextResponse.json({ error: 'عميل الواتساب غير متصل. يرجى المسح أو الاتصال أولاً.' }, { status: 503 });
    }

    // Clean phone number format
    let formattedPhone = phone.trim().replace(/[^0-9]/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone = `${formattedPhone}@c.us`;
    }

    // Process media if present
    if (mediaUrl) {
      try {
        let media: MessageMedia;
        if (mediaUrl.startsWith('http')) {
          media = await MessageMedia.fromUrl(mediaUrl);
        } else {
          const filePath = join(process.cwd(), 'public', mediaUrl);
          if (existsSync(filePath)) {
            media = MessageMedia.fromFilePath(filePath);
          } else {
            throw new Error(`الملف غير موجود: ${filePath}`);
          }
        }
        await client.sendMessage(formattedPhone, media, { caption: message });
      } catch (mediaErr: any) {
        console.warn('Test send media failed, falling back to text:', mediaErr);
        await client.sendMessage(formattedPhone, `[تجريبي] ${message}`);
      }
    } else {
      await client.sendMessage(formattedPhone, `[رسالة تجريبية]\n\n${message}`);
    }

    return NextResponse.json({ success: true, message: 'تم إرسال الرسالة التجريبية بنجاح' });
  } catch (error: any) {
    console.error('Test send error:', error);
    return NextResponse.json({ error: error.message || 'فشل إرسال الرسالة التجريبية' }, { status: 500 });
  }
}
