import { Client, MessageMedia } from 'whatsapp-web.js';
import { prisma } from '../prisma';
import { join } from 'path';
import { existsSync } from 'fs';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

// ─── Gemini Helper ────────────────────────────────────────────────────────────
async function askGemini(text: string, config: any): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  const kbs = await prisma.knowledgeFile.findMany();
  let systemPrompt = config.systemPrompt || 'أنت مساعد ذكي لخدمة العملاء. أجب بشكل احترافي ومختصر وباللغة العربية.';
  if (kbs.length > 0) {
    systemPrompt += '\\n\\nاستعن بالمعلومات التالية في إجاباتك عند الحاجة:\\n';
    kbs.forEach((kb: any) => {
      systemPrompt += `\\n[ملف: ${kb.fileName}]\\n${kb.content}\\n`;
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: text,
    config: { systemInstruction: systemPrompt },
  });
  if (!response.text) throw new Error('Empty response from Gemini');
  return response.text;
}

// ─── OpenAI Helper ────────────────────────────────────────────────────────────
async function askOpenAI(text: string, config: any): Promise<string> {
  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  
  const kbs = await prisma.knowledgeFile.findMany();
  let systemPrompt = config.systemPrompt || 'أنت مساعد ذكي لخدمة العملاء. أجب بشكل احترافي ومختصر وباللغة العربية.';
  if (kbs.length > 0) {
    systemPrompt += '\\n\\nاستعن بالمعلومات التالية في إجاباتك عند الحاجة:\\n';
    kbs.forEach((kb: any) => {
      systemPrompt += `\\n[معلومة إضافية: ${kb.fileName}]\\n${kb.content}\\n`;
    });
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    max_tokens: 500,
  });
  const reply = completion.choices[0]?.message?.content;
  if (!reply) throw new Error('Empty response from OpenAI');
  return reply;
}

// ─── Smart AI Router (Primary + Fallback) ─────────────────────────────────────
async function askAI(text: string, config: any): Promise<string | null> {
  const primary = config.provider || 'gemini';
  const hasGemini = !!config.apiKey;
  const hasOpenAI = !!config.openaiApiKey;

  const tryGemini = async () => {
    if (!hasGemini) throw new Error('No Gemini key');
    console.log('Asking Gemini AI...');
    return await askGemini(text, config);
  };

  const tryOpenAI = async () => {
    if (!hasOpenAI) throw new Error('No OpenAI key');
    console.log('Asking OpenAI (ChatGPT)...');
    return await askOpenAI(text, config);
  };

  try {
    return primary === 'openai' ? await tryOpenAI() : await tryGemini();
  } catch (primaryErr: any) {
    console.warn(`Primary AI (${primary}) failed. Trying fallback...`);
    if (config.fallbackEnabled !== false) {
      try {
        return primary === 'openai' ? await tryGemini() : await tryOpenAI();
      } catch (fallbackErr: any) {
        console.error('Fallback AI also failed:', fallbackErr.message);
      }
    }
    return null;
  }
}

// ─── Save message to Live Inbox ────────────────────────────────────────────────
async function saveToInbox(phone: string, direction: 'in' | 'out', body: string, sessionId = 'default', botHandled = false) {
  try {
    const contact = await prisma.contact.findUnique({ where: { phone } });
    await (prisma as any).chatMessage.create({
      data: { phone, contactId: contact?.id ?? null, direction, body, sessionId, botHandled, isRead: direction === 'out' },
    });
  } catch (e) { /* ignore */ }
}

export const initWAService = (client: Client) => {
  client.on('message', async (msg) => {
    if (msg.from === 'status@broadcast') return;

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const phone = msg.from.split('@')[0];
    const text = msg.body.trim();

    // ─── Save incoming message to Live Inbox ─────────────────────────────────
    await saveToInbox(phone, 'in', text);

    // ─── Check if human has taken over this chat (humanMode) ─────────────────
    const lastAgentMsg = await (prisma as any).chatMessage.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: { humanMode: true },
    });
    if (lastAgentMsg?.humanMode) {
      console.log(`[Live Inbox] Human mode active for ${phone}. Bot is paused.`);
      return;
    }

    const lowerText = text.toLowerCase();

    // ─── Blacklist / opt-out ──────────────────────────────────────────────────
    const blacklistKeywords = ['إيقاف', 'stop', 'unsubscribe', 'قائمة سوداء', 'cancel', 'إلغاء'];
    if (blacklistKeywords.includes(lowerText)) {
      try {
        await prisma.contact.upsert({
          where: { phone },
          update: { isBlacklisted: true },
          create: { phone, isBlacklisted: true, source: 'bot_optout' },
        });
        const replyText = 'تم إيقاف إرسال الرسائل إلى هذا الرقم بنجاح. عذراً على إزعاجك.';
        await msg.reply(replyText);
        await saveToInbox(phone, 'out', replyText);
        return;
      } catch (error) {
        console.error('Error blacklisting contact:', error);
      }
    }

    // ─── Check bot rules ──────────────────────────────────────────────────────
    const rules = await prisma.botRule.findMany({ where: { isActive: true } });
    const rule = rules.find((r: any) => {
      const keyword = r.keyword.toLowerCase();
      if (r.matchType === 'exact') return lowerText === keyword;
      if (r.matchType === 'contains') return lowerText.includes(keyword);
      if (r.matchType === 'starts_with') return lowerText.startsWith(keyword);
      return false;
    });

    if (rule) {
      try {
        await chat.sendStateTyping();
        if ((rule as any).mediaUrl) {
          try {
            let media: MessageMedia;
            if ((rule as any).mediaUrl.startsWith('http')) {
              media = await MessageMedia.fromUrl((rule as any).mediaUrl);
            } else {
              const filePath = join(process.cwd(), 'public', (rule as any).mediaUrl);
              if (existsSync(filePath)) media = MessageMedia.fromFilePath(filePath);
              else throw new Error(`Local file not found: ${filePath}`);
            }
            await client.sendMessage(msg.from, media, { caption: rule.reply });
          } catch (mediaError) {
            console.error('Bot media reply error:', mediaError);
            await msg.reply(rule.reply);
          }
        } else {
          await msg.reply(rule.reply);
        }
        await saveToInbox(phone, 'out', rule.reply, 'default', true);
        console.log(`Bot replied to "${lowerText}" (Type: ${(rule as any).matchType})`);
        await prisma.botRule.update({ where: { id: rule.id }, data: { hitCount: { increment: 1 } } });
        const today = new Date(); today.setHours(0, 0, 0, 0);
        await prisma.dailyStats.upsert({ where: { date: today }, update: { botReplied: { increment: 1 } }, create: { date: today, botReplied: 1 } });
      } catch (error) {
        console.error('Bot reply error:', error);
      }
    } else {
      // ─── No rule matched → try AI ─────────────────────────────────────────
      try {
        const aiConfig = await prisma.aIConfig.findFirst();
        if (aiConfig?.isEnabled && (aiConfig.apiKey || (aiConfig as any).openaiApiKey)) {
          await chat.sendStateTyping();
          const reply = await askAI(lowerText, aiConfig);
          if (reply) {
            await msg.reply(reply);
            await saveToInbox(phone, 'out', reply, 'default', true);
            console.log('AI replied successfully.');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            await prisma.dailyStats.upsert({ where: { date: today }, update: { aiReplied: { increment: 1 } }, create: { date: today, aiReplied: 1 } });
          } else {
            await msg.reply('⚠️ عذراً، المساعد الذكي غير متاح حالياً. يرجى التواصل معنا مباشرة.');
          }
        }
      } catch (error: any) {
        console.error('AI Service Error:', error);
      }
    }
  });

  // ─── Track delivery & read receipts ──────────────────────────────────────────
  client.on('message_ack', async (msg: any, ack: number) => {
    try {
      if (ack < 1) return;
      const phone = msg.to?.split('@')[0];
      if (!phone) return;

      await prisma.campaignContact.updateMany({
        where: { contact: { phone }, status: 'sent', ackStatus: { lt: ack } },
        data: { ackStatus: ack, ...(ack >= 3 ? { readAt: new Date() } : {}) },
      });

      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (ack === 2) {
        await prisma.dailyStats.upsert({ where: { date: today }, update: { delivered: { increment: 1 } }, create: { date: today, delivered: 1 } });
      } else if (ack === 3) {
        await prisma.dailyStats.upsert({ where: { date: today }, update: { read: { increment: 1 } }, create: { date: today, read: 1 } });
      }
    } catch (e) { /* ignore */ }
  });
};
