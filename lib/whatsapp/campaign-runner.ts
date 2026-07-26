import { getWAClient, getWAStatus } from './client';
import { prisma } from '../prisma';
import { MessageMedia } from 'whatsapp-web.js';
import { join } from 'path';
import { existsSync } from 'fs';

export const runCampaign = async (campaignId: number) => {
  console.log(`[CAMPAIGN RUNNER] Received request to run campaign #${campaignId}`);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      contacts: {
        where: { status: 'pending' },
        include: { contact: true },
      },
    },
  });

  if (!campaign) {
    console.warn(`[CAMPAIGN RUNNER] Campaign #${campaignId} not found in database.`);
    return;
  }

  if (campaign.status === 'done') {
    console.log(`[CAMPAIGN RUNNER] Campaign #${campaignId} is already completed ('done').`);
    return;
  }

  // Check if WhatsApp is actually connected and authenticated
  const memStatus = getWAStatus(campaign.sessionId || 'default').status;
  const dbSession = await prisma.wASession.findUnique({
    where: { sessionId: campaign.sessionId || 'default' }
  });

  console.log(`[CAMPAIGN RUNNER] Session "${campaign.sessionId || 'default'}": Memory Status = ${memStatus}, DB Status = ${dbSession?.status}`);

  if (memStatus === 'qr' || memStatus === 'disconnected') {
    console.warn(`[CAMPAIGN RUNNER] WhatsApp session "${campaign.sessionId || 'default'}" requires QR scan (Status: ${memStatus}). Resetting campaign to draft.`);
    
    // Sync database session status to QR
    if (dbSession && dbSession.status !== memStatus) {
      await prisma.wASession.update({
        where: { sessionId: campaign.sessionId || 'default' },
        data: { status: memStatus }
      });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'draft' },
    });
    return;
  }

  console.log(`[CAMPAIGN RUNNER] Campaign #${campaignId} has ${campaign.contacts?.length || 0} pending contacts.`);

  // If no pending contacts exist for this campaign
  if (!campaign.contacts || campaign.contacts.length === 0) {
    const totalCount = await prisma.campaignContact.count({ where: { campaignId } });
    console.warn(`[CAMPAIGN RUNNER] 0 pending contacts found for campaign #${campaignId} (Total contacts in campaign: ${totalCount}). Marking campaign as ${totalCount > 0 ? 'done' : 'failed'}.`);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: totalCount > 0 ? 'done' : 'failed' },
    });
    return;
  }

  // ─── Ensure client is fully connected & window.Store is ready ────────────
  let currentStatus = getWAStatus(campaign.sessionId || 'default').status;
  if (currentStatus === 'connecting') {
    console.log(`[CAMPAIGN RUNNER] Session "${campaign.sessionId || 'default'}" is currently connecting. Waiting for ready state...`);
    let waitMs = 0;
    while (currentStatus === 'connecting' && waitMs < 25000) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitMs += 1000;
      currentStatus = getWAStatus(campaign.sessionId || 'default').status;
    }
    console.log(`[CAMPAIGN RUNNER] After waiting: Session "${campaign.sessionId || 'default'}" status = ${currentStatus}`);
  }

  const client = getWAClient(campaign.sessionId || 'default');
  
  if (!client || currentStatus !== 'connected') {
    console.warn(`[CAMPAIGN RUNNER] WhatsApp session "${campaign.sessionId || 'default'}" is not fully ready (Status: ${currentStatus}). Resetting campaign to draft.`);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'draft' },
    });
    return;
  }

  // Update campaign status to running
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'running' },
  });

  let messagesSentThisBatch = 0;

  for (const camContact of campaign.contacts) {
    // Re-fetch campaign status to check if it was paused/cancelled
    const currentCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    
    if (currentCampaign?.status !== 'running') break;

    const { contact } = camContact;
    
    // Check if blacklisted directly to be safe
    const freshContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      select: { isBlacklisted: true }
    });

    if (freshContact?.isBlacklisted) {
      await prisma.campaignContact.update({
        where: { id: camContact.id },
        data: { status: 'failed', error: 'رقم في القائمة السوداء (Blacklisted)' },
      });
      continue;
    }

    const cleanPhone = contact.phone.trim().replace(/[^0-9]/g, '');
    const chatId = `${cleanPhone}@c.us`;

    try {
      // ─── 1. Calculate random delay (Anti-Ban) ───────────────────────────────
      const minSec = (campaign as any).minDelay || 3;
      const maxSec = (campaign as any).maxDelay || 10;
      const totalDelayMs = (minSec * 1000) + Math.random() * ((maxSec - minSec) * 1000);
      
      // Reserve 2 to 4 seconds for "Typing..." simulation before sending
      const typingTimeMs = Math.min(Math.max(2000, Math.floor(Math.random() * 2000) + 2000), totalDelayMs);
      const initialWaitMs = Math.max(500, totalDelayMs - typingTimeMs);

      // Initial random wait
      await new Promise(resolve => setTimeout(resolve, initialWaitMs));

      // ─── 2. Realistic Typing Presence Simulation ("جاري الكتابة...") ─────────
      try {
        const chat = await client.getChatById(chatId);
        if (chat) {
          await chat.sendStateTyping();
          // Wait while typing indicator is active
          await new Promise(resolve => setTimeout(resolve, typingTimeMs));
        }
      } catch (typingErr) {
        // If chat typing state isn't supported, just wait out the typing time
        await new Promise(resolve => setTimeout(resolve, typingTimeMs));
      }

      // ─── 3. Message & Spintax Parsing ─────────────────────────────────────────
      let message = campaign.message;
      
      // Spintax Parsing: {Hello|Hi|Hey}
      message = message.replace(/\{([^{}]+)\}/g, (match, p1) => {
        if (p1.includes('|')) {
          const options = p1.split('|');
          return options[Math.floor(Math.random() * options.length)];
        }
        return match;
      });

      // Variable Replacement
      message = message.replace(/{name}/gi, contact.name || '');
      
      // Dynamic Metadata Replacement from Excel columns
      if ((contact as any).metadata) {
        try {
          const meta = JSON.parse((contact as any).metadata);
          Object.keys(meta).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'gi');
            message = message.replace(regex, String(meta[key]));
          });
        } catch (e) {
          console.warn('Failed to parse metadata for contact:', contact.phone);
        }
      }

      // ─── 4. Dispatch Message ──────────────────────────────────────────────────
      if (campaign.mediaUrl) {
        try {
          let media: MessageMedia;
          if (campaign.mediaUrl.startsWith('http')) {
            media = await MessageMedia.fromUrl(campaign.mediaUrl);
          } else {
            const filePath = join(process.cwd(), 'public', campaign.mediaUrl);
            if (existsSync(filePath)) {
              media = MessageMedia.fromFilePath(filePath);
            } else {
              throw new Error(`Local file not found: ${filePath}`);
            }
          }
          
          // Safe send media message with getChat retry
          let sent = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await client.sendMessage(chatId, media, { caption: message });
              sent = true;
              break;
            } catch (err: any) {
              if (err?.message?.includes('getChat') && attempt < 3) {
                console.warn(`[CAMPAIGN RUNNER] WhatsApp Web Store getChat delay on attempt ${attempt}, waiting 3s...`);
                await new Promise(r => setTimeout(r, 3000));
              } else {
                throw err;
              }
            }
          }
        } catch (mediaError) {
          console.error(`Failed to load media from ${campaign.mediaUrl}, sending text only:`, mediaError);
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await client.sendMessage(chatId, message);
              break;
            } catch (err: any) {
              if (err?.message?.includes('getChat') && attempt < 3) {
                console.warn(`[CAMPAIGN RUNNER] WhatsApp Web Store getChat delay on attempt ${attempt}, waiting 3s...`);
                await new Promise(r => setTimeout(r, 3000));
              } else {
                throw err;
              }
            }
          }
        }
      } else {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await client.sendMessage(chatId, message);
            break;
          } catch (err: any) {
            if (err?.message?.includes('getChat') && attempt < 3) {
              console.warn(`[CAMPAIGN RUNNER] WhatsApp Web Store getChat delay on attempt ${attempt}, waiting 3s...`);
              await new Promise(r => setTimeout(r, 3000));
            } else {
              throw err;
            }
          }
        }
      }

      // Clear typing indicator state after sending
      try {
        const chat = await client.getChatById(chatId);
        if (chat) await chat.clearState();
      } catch (e) { /* ignore */ }

      // Update contact status
      await prisma.campaignContact.update({
        where: { id: camContact.id },
        data: { status: 'sent', sentAt: new Date() },
      });

      // Update global stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.dailyStats.upsert({
        where: { date: today },
        update: { sent: { increment: 1 } },
        create: { date: today, sent: 1 },
      });

      messagesSentThisBatch++;

      // ─── 5. Auto-Pause (Batching) Logic ───────────────────────────────────────
      if (campaign.batchSize && campaign.batchDelay && messagesSentThisBatch >= campaign.batchSize) {
        console.log(`[Batch Pause] Campaign ${campaignId} processed batch of ${messagesSentThisBatch} messages. Pausing for ${campaign.batchDelay} minutes...`);
        messagesSentThisBatch = 0;
        await new Promise(resolve => setTimeout(resolve, campaign.batchDelay! * 60 * 1000));
      }

    } catch (error: any) {
      console.error(`Failed to send to ${contact.phone}:`, error);
      await prisma.campaignContact.update({
        where: { id: camContact.id },
        data: { status: 'failed', error: error.message || 'Unknown error' },
      });
      
      await prisma.dailyStats.upsert({
        where: {
          date: new Date(new Date().setHours(0,0,0,0))
        },
        update: { failed: { increment: 1 } },
        create: { date: new Date(new Date().setHours(0,0,0,0)), failed: 1 }
      });
    }
  }

  // Check if all contacts are processed
  const remaining = await prisma.campaignContact.count({
    where: { campaignId, status: 'pending' },
  });

  if (remaining === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'done' },
    });
  } else {
    const finalCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (finalCampaign?.status === 'running') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'paused' },
      });
    }
  }
};
