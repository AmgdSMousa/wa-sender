import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import fs from "fs";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export const activeSockets = new Map<string, any>();

export async function initWhatsAppManager() {
  await prisma.device.updateMany({
    data: { status: "disconnected", qr: null }
  });

  const devices = await prisma.device.findMany();
  for (const device of devices) {
    if (device.phone || fs.existsSync(`./sessions/${device.id}`)) {
       startSession(device.id);
    }
  }
}

export async function startSession(deviceId: string) {
  if (activeSockets.has(deviceId)) return activeSockets.get(deviceId);
  
  if (!fs.existsSync(`./sessions`)) fs.mkdirSync(`./sessions`);

  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${deviceId}`);
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "info" }) as any,
    browser: ["Pro Sender Studio", "Chrome", "1.0.0"],
    syncFullHistory: false
  });

  activeSockets.set(deviceId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await prisma.device.update({
        where: { id: deviceId },
        data: { qr, status: "qr_ready" }
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;
      
      activeSockets.delete(deviceId);
      
      if (shouldReconnect) {
        setTimeout(() => startSession(deviceId), 5000);
      } else {
        await prisma.device.updateMany({ where: { id: deviceId }, data: { status: "disconnected", qr: null, phone: null } });
        fs.rmSync(`./sessions/${deviceId}`, { recursive: true, force: true });
      }
    } else if (connection === "open") {
      const userJid = sock.user?.id || "";
      const phone = userJid.split(":")[0]?.split("@")[0];
      await prisma.device.update({
        where: { id: deviceId },
        data: { status: "connected", qr: null, phone: phone || null }
      });
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      
      try {
        const device = await prisma.device.findUnique({ where: { id: deviceId } });
        if (!device || !device.userId) return;

        const from = msg.key.remoteJid?.split('@')[0];
        if (!from) return;

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        if (!text) return;

        console.log(`[Auto-Reply] Received message from ${from}: "${text}"`);

        // Skip if blocked for this user
        const blocked = await prisma.blockedNumber.findFirst({ where: { phone: from, userId: device.userId } });
        if (blocked) {
           console.log(`[Auto-Reply] Number ${from} is blocked. Ignoring.`);
           return;
        }

        const rules = await prisma.rule.findMany({ where: { active: true, userId: device.userId } });
        if (rules.length === 0) {
           console.log(`[Auto-Reply] No active rules found in database for user ${device.userId}. Please add rules in the Dashboard.`);
        }

        let matchedRule = null;
        for (const rule of rules) {
          const kw = rule.keyword.toLowerCase();
          const t = text.trim().toLowerCase();
          if (rule.matchType === "equals" && t === kw) { matchedRule = rule; break; }
          if (rule.matchType === "contains" && t.includes(kw)) { matchedRule = rule; break; }
          if (rule.matchType === "starts_with" && t.startsWith(kw)) { matchedRule = rule; break; }
        }

        if (matchedRule && matchedRule.replyText) {
          console.log(`[Auto-Reply] Rule matched for keyword "${matchedRule.keyword}". Sending reply to ${from}...`);
          await sock.sendMessage(msg.key.remoteJid!, { text: matchedRule.replyText });
          console.log(`[Auto-Reply] Reply sent successfully to ${from}.`);
        } else {
          console.log(`[Auto-Reply] No matching rule found for the message.`);
        }
      } catch (err) {
        console.error("Chatbot processing error:", err);
      }
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (update.update.status && update.key.id) {
        // status: 3 = Delivered, 4 = Read
        const s = update.update.status;
        if (s === 3 || s === 4) {
          const newStatus = s === 3 ? "delivered" : "read";
          try {
            const dataToUpdate: any = { status: newStatus };
            if (newStatus === "delivered") dataToUpdate.deliveredAt = new Date();
            if (newStatus === "read") dataToUpdate.readAt = new Date();
            
            await prisma.deliveryJob.updateMany({
              where: { messageId: update.key.id, status: { notIn: ["read"] } }, // Do not overwrite 'read' with 'delivered' if events come out of order
              data: dataToUpdate
            });
          } catch (e) {
            // Ignore if record doesn't exist
          }
        }
      }
    }
  });

  return sock;
}

export async function deleteSession(deviceId: string) {
  const sock = activeSockets.get(deviceId);
  if (sock) {
    try { sock.logout(); } catch (e) {}
    activeSockets.delete(deviceId);
  }
  try {
     await prisma.device.delete({ where: { id: deviceId } });
  } catch(e) {}
  fs.rmSync(`./sessions/${deviceId}`, { recursive: true, force: true });
}

export async function checkWhatsAppNumbers(deviceId: string, numbers: string[]): Promise<{phone: string, exists: boolean}[]> {
  const sock = activeSockets.get(deviceId);
  if (!sock) return numbers.map(n => ({ phone: n, exists: false }));

  const results = [];
  for (const num of numbers) {
    try {
      const formatted = num.replace(/[^\d]/g, "") + "@s.whatsapp.net";
      const [result] = await sock.onWhatsApp(formatted);
      results.push({ phone: num, exists: result?.exists || false });
    } catch (err) {
      console.error(`Check failed for ${num}:`, err);
      results.push({ phone: num, exists: false });
    }
  }
  return results;
}
