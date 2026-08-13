import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

dotenv.config();

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = 3000;

// Parse JSON request bodies
app.use(express.json({ limit: "10mb", verify: (req, _res, buffer) => {
  (req as express.Request & { rawBody?: Buffer }).rawBody = buffer;
} }));

const isNonEmptyString = (value: unknown, maxLength: number) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

const parseCampaignData = (data: string) => {
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

type WhatsAppMessageType = "text" | "image" | "document" | "video";
type DeliveryPayload = {
  phone: string;
  message: string;
  type: WhatsAppMessageType;
  mediaUrl?: string;
  mediaId?: string;
};

import { initWhatsAppManager, startSession, deleteSession, activeSockets } from "./whatsapp-manager";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateToken, requireAdmin, AuthRequest, generateToken } from "./auth";

function personalizeMessage(template: string, recipient: Record<string, unknown>) {
  return template
    .replace(/{name}/g, String(recipient.name || "Customer"))
    .replace(/{order_number}/g, String(recipient.orderNumber || ""))
    .replace(/{email}/g, String(recipient.email || ""))
    .replace(/{phone}/g, String(recipient.phone || ""));
}

// Lazy initializer for Google Gen AI
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY is not configured. Please add your Gemini API Key in the Secrets panel under Settings in AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Check API status endpoint
app.get("/api/ai-status", (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = !!apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";
  res.json({ configured: isConfigured });
});

// ======================= AUTH ENDPOINTS =======================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Missing fields" });
    
    // The first user created will be admin, others will be user
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "admin" : "user";
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role }
    });
    
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(400).json({ error: "Registration failed (Email might exist)" }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    if (user.isActive === false) return res.status(403).json({ error: "Account suspended" });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: "Login failed" }); }
});

export const onlineUsers = new Map<number, number>();

// Track online users middleware
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key_for_dev") as any;
      if (decoded && decoded.id) {
        onlineUsers.set(decoded.id, Date.now());
      }
    } catch(e) {}
  }
  next();
});

// Admin-only stats endpoint
app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.count();
    const campaigns = await prisma.campaign.count();
    const devices = await prisma.device.count();
    const messages = await prisma.deliveryJob.count({ where: { status: "sent" } });
    
    // Calculate online users (active in the last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let onlineUsersCount = 0;
    for (const lastActive of onlineUsers.values()) {
      if (lastActive >= fiveMinutesAgo) onlineUsersCount++;
    }

    res.json({ users, campaigns, devices, messages, onlineUsers: onlineUsersCount });
  } catch (e) { res.status(500).json({ error: "Failed to load stats" }); }
});

app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } });
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const mappedUsers = users.map(u => ({
      ...u,
      isOnline: (onlineUsers.get(u.id) || 0) >= fiveMinutesAgo
    }));
    res.json(mappedUsers);
  } catch (e) { res.status(500).json({ error: "Failed to load users" }); }
});

app.patch("/api/admin/users/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });
    if (id === req.userId) return res.status(400).json({ error: "لا يمكنك إيقاف حسابك الشخصي" });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    res.json({ id: updated.id, isActive: updated.isActive });
  } catch (e) { res.status(500).json({ error: "Failed to update user status" }); }
});

app.patch("/api/admin/users/:id/password", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (isNaN(id) || !password || password.length < 6) return res.status(400).json({ error: "Invalid password (must be at least 6 characters)" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed to reset password" }); }
});

app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });
    if (id === req.userId) return res.status(400).json({ error: "لا يمكنك حذف حسابك الشخصي" });

    await prisma.user.delete({ where: { id } });
    // Cleanup any lingering online status
    onlineUsers.delete(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed to delete user" }); }
});

// ======================= DB ENDPOINTS =======================

// --- Campaigns ---
app.get("/api/campaigns", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = await prisma.campaign.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId }, orderBy: { createdAt: 'desc' } });
    
    const stats = await prisma.deliveryJob.groupBy({
      by: ['campaignId', 'status'],
      _count: { id: true },
      where: { campaignId: { in: data.map(c => c.id) } }
    });

    res.json(data.map(c => {
      const campStats = stats.filter(s => s.campaignId === c.id);
      const sentCount = campStats.find(s => s.status === 'sent')?._count.id || 0;
      const deliveredCount = campStats.find(s => s.status === 'delivered')?._count.id || 0;
      const readCount = campStats.find(s => s.status === 'read')?._count.id || 0;
      const failCount = campStats.filter(s => s.status === 'failed' || s.status === 'skipped').reduce((a, b) => a + b._count.id, 0);

      const parsedData = parseCampaignData(c.data);
      
      return {
        ...parsedData,
        id: c.id.toString(), // React components expect string IDs
        name: c.name,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        scheduledAt: c.scheduledFor?.toISOString(),
        sentCount: (parsedData.sentCount || 0) + sentCount + deliveredCount + readCount,
        deliveredCount: deliveredCount,
        readCount: readCount,
        failCount: (parsedData.failCount || 0) + failCount,
      };
    }));
  } catch(e) { res.status(500).json({ error: "Unable to load campaigns" }); }
});

app.post("/api/campaigns", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!isNonEmptyString(req.body.name, 120)) {
      return res.status(400).json({ error: "A campaign name of up to 120 characters is required." });
    }
    if (!Array.isArray(req.body.recipients) || req.body.recipients.length > 10000) {
      return res.status(400).json({ error: "Recipients must be an array containing at most 10,000 entries." });
    }
    const data = await prisma.campaign.create({
      data: {
        userId: req.userId,
        name: req.body.name.trim(),
        status: req.body.status || "pending",
        scheduledFor: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
        data: JSON.stringify({
          messageTemplate: String(req.body.messageTemplate || ""),
          attachmentUrl: typeof req.body.attachmentUrl === "string" ? req.body.attachmentUrl : undefined,
          attachmentType: typeof req.body.attachmentType === "string" ? req.body.attachmentType : undefined,
          attachmentCaption: typeof req.body.attachmentCaption === "string" ? req.body.attachmentCaption : undefined,
          recipients: req.body.recipients,
          scheduledEndTime: typeof req.body.scheduledEndTime === "string" ? req.body.scheduledEndTime : undefined,
          delayMin: Number(req.body.delayMin) || 0,
          delayMax: Number(req.body.delayMax) || 0,
          batchSize: Number(req.body.batchSize) || 0,
          batchDelay: Number(req.body.batchDelay) || 0,
          useAntiSpamId: Boolean(req.body.useAntiSpamId),
          sentCount: Number(req.body.sentCount) || 0,
          failCount: Number(req.body.failCount) || 0,
          logs: Array.isArray(req.body.logs) ? req.body.logs.slice(0, 1000) : [],
        }),
      }
    });
    res.json({
      ...parseCampaignData(data.data), id: data.id.toString(), name: data.name,
      status: data.status, createdAt: data.createdAt.toISOString(), scheduledAt: data.scheduledFor?.toISOString(),
    });
  } catch(e) { res.status(500).json({error: "DB fault"}) }
});

// Turn a saved campaign into durable delivery jobs. It is intentionally separate
// from campaign creation so a draft can be reviewed before it is sent.
app.post("/api/campaigns/:id/dispatch", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(campaignId)) return res.status(400).json({ error: "Invalid campaign ID." });
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (campaign && campaign.userId !== req.userId && req.userRole !== "admin") return res.status(403).json({ error: "Unauthorized" });
    if (!campaign) return res.status(404).json({ error: "Campaign not found." });
    const details = parseCampaignData(campaign.data) as Record<string, any>;
    const recipients = Array.isArray(details.recipients) ? details.recipients : [];
    if (recipients.length === 0) return res.status(400).json({ error: "Campaign has no recipients." });
    const existingJobs = await prisma.deliveryJob.count({ where: { campaignId } });
    if (existingJobs > 0) return res.status(409).json({ error: "This campaign has already been queued." });

    const startAt = campaign.scheduledFor && campaign.scheduledFor > new Date() ? campaign.scheduledFor : new Date();
    const delayMin = Math.max(0, Number(details.delayMin) || 0);
    const delayMax = Math.max(delayMin, Number(details.delayMax) || delayMin);
    const batchSize = Math.max(1, Number(details.batchSize) || recipients.length);
    const batchDelayMs = Math.max(0, Number(details.batchDelay) || 0) * 60_000;
    let offsetMs = 0;
    const jobs = recipients.map((recipient: Record<string, unknown>, index: number) => {
      if (index > 0) offsetMs += (delayMin + Math.random() * (delayMax - delayMin)) * 1000;
      if (index > 0 && index % batchSize === 0) offsetMs += batchDelayMs;
      const type: WhatsAppMessageType = ["image", "document", "video"].includes(details.attachmentType) ? details.attachmentType : "text";
      let finalMessage = personalizeMessage(String(details.messageTemplate || ""), recipient);
      if (details.useAntiSpamId) {
        // Generate an invisible unique signature using zero-width characters
        const chars = ['\u200B', '\u200C', '\u200D', '\u200E', '\u200F'];
        let invisibleSig = '';
        const length = Math.floor(Math.random() * 15) + 5; // 5 to 19 invisible chars
        for (let i = 0; i < length; i++) invisibleSig += chars[Math.floor(Math.random() * chars.length)];
        // Append \u2800 (Braille Blank) at the end. It looks like a space but prevents WhatsApp from stripping the trailing zero-width characters!
        finalMessage += invisibleSig + '\u2800';
      }
      const payload: DeliveryPayload = {
        phone: String(recipient.phone || ""),
        message: finalMessage,
        type,
      };
      return { campaignId, recipient: JSON.stringify(recipient), payload: JSON.stringify(payload), availableAt: new Date(startAt.getTime() + offsetMs) };
    });
    await prisma.$transaction([
      prisma.deliveryJob.createMany({ data: jobs }),
      prisma.campaign.update({ where: { id: campaignId }, data: { status: startAt > new Date() ? "scheduled" : "queued" } }),
    ]);
    res.status(202).json({ campaignId: campaignId.toString(), jobsQueued: jobs.length, status: startAt > new Date() ? "scheduled" : "queued" });
  } catch (error) {
    console.error("Unable to queue campaign:", error);
    res.status(500).json({ error: "Unable to queue campaign." });
  }
});

// Toggle pause/resume for a campaign
app.put("/api/campaigns/:id/toggle-status", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number.parseInt(req.params.id, 10);
    const { action } = req.body; // "pause" or "resume"
    if (!Number.isInteger(campaignId)) return res.status(400).json({ error: "Invalid campaign ID." });

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ error: "Campaign not found." });
    if (campaign.userId !== req.userId && req.userRole !== "admin") return res.status(403).json({ error: "Unauthorized" });

    if (action === "pause") {
      await prisma.$transaction([
        prisma.campaign.update({ where: { id: campaignId }, data: { status: "paused" } }),
        prisma.deliveryJob.updateMany({
          where: { campaignId, status: "pending" },
          data: { status: "paused" }
        })
      ]);
      return res.json({ success: true, status: "paused" });
    } else if (action === "resume") {
      await prisma.$transaction([
        prisma.campaign.update({ where: { id: campaignId }, data: { status: "sending" } }),
        prisma.deliveryJob.updateMany({
          where: { campaignId, status: "paused" },
          data: { status: "pending" }
        })
      ]);
      return res.json({ success: true, status: "sending" });
    }
    return res.status(400).json({ error: "Invalid action." });
  } catch (error) {
    console.error("Error toggling status:", error);
    res.status(500).json({ error: "Server error" });
  }
});
app.delete("/api/campaigns/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(campaignId)) return res.status(400).json({ error: "Invalid campaign ID." });
    
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ error: "Campaign not found." });
    if (campaign.userId !== req.userId && req.userRole !== "admin") return res.status(403).json({ error: "Unauthorized" });

    // Delete associated jobs first
    await prisma.deliveryJob.deleteMany({ where: { campaignId } });
    await prisma.campaign.delete({ where: { id: campaignId } });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/campaigns/:id/progress", authenticateToken, async (req: AuthRequest, res) => {
  const campaignId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(campaignId)) return res.status(400).json({ error: "Invalid campaign ID." });
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || (campaign.userId !== req.userId && req.userRole !== "admin")) return res.status(403).json({ error: "Unauthorized" });
  const grouped = await prisma.deliveryJob.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });
  res.json(Object.fromEntries(grouped.map(item => [item.status, item._count._all])));
});

// --- Templates ---
app.get("/api/templates", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = await prisma.template.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId }, orderBy: { id: 'desc' } });
    res.json(data.map(t => ({
      id: t.id.toString(),
      name: t.name,
      message: t.content,
      language: t.language
    })));
  } catch(e) { res.json([]) }
});

app.post("/api/templates", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = await prisma.template.create({
      data: {
        userId: req.userId,
        name: req.body.name,
        content: req.body.message || req.body.content,
        language: req.body.language || "ar"
      }
    });
    res.json({ id: data.id.toString(), name: data.name, message: data.content, language: data.language });
  } catch(e) { res.status(500).json({error: "DB fault"}) }
});

app.delete("/api/templates/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isNaN(id)) await prisma.template.deleteMany({ where: { id, ...(req.userRole !== "admin" && { userId: req.userId }) } });
    res.json({ success: true });
  } catch(e) { res.json({ success: false }) }
});

// --- Chatbot Rules ---
app.get("/api/rules", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const rules = await prisma.rule.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId } });
    res.json(rules.map(r => ({
      id: r.id.toString(),
      trigger: r.keyword,
      triggerType: r.matchType,
      response: r.replyText,
      active: r.active
    })));
  } catch(e) { res.json([]) }
});

app.post("/api/rules", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const matchTypes = ["equals", "contains", "starts_with"];
    if (!isNonEmptyString(req.body.trigger, 200) || !isNonEmptyString(req.body.response, 4096) || !matchTypes.includes(req.body.triggerType)) {
      return res.status(400).json({ error: "Invalid rule data." });
    }
    const rule = await prisma.rule.create({
      data: {
        userId: req.userId,
        keyword: req.body.trigger.trim(),
        matchType: req.body.triggerType,
        replyText: req.body.response.trim(),
        active: req.body.active !== false,
      }
    });
    res.json({
      id: rule.id.toString(),
      trigger: rule.keyword,
      triggerType: rule.matchType,
      response: rule.replyText,
      active: rule.active
    });
  } catch(e) { res.status(500).json({error: "DB fault"}) }
});

app.delete("/api/rules/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isNaN(id)) await prisma.rule.deleteMany({ where: { id, ...(req.userRole !== "admin" && { userId: req.userId }) } });
    res.json({ success: true });
  } catch(e) { res.json({ success: false }) }
});

app.patch("/api/rules/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || typeof req.body.active !== "boolean") {
      return res.status(400).json({ error: "Invalid rule update." });
    }
    const existing = await prisma.rule.findUnique({ where: { id } });
    if (!existing || (existing.userId !== req.userId && req.userRole !== "admin")) return res.status(403).json({ error: "Unauthorized" });
    const rule = await prisma.rule.update({ where: { id }, data: { active: req.body.active } });
    res.json({ id: rule.id.toString(), active: rule.active });
  } catch {
    res.status(404).json({ error: "Rule not found." });
  }
});

// --- Blocked Numbers ---
app.get("/api/blocked", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = await prisma.blockedNumber.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId } });
    res.json(data.map(d => d.phone));
  } catch(e) { res.json([]) }
});

app.post("/api/blocked", authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.blockedNumber.create({ data: { userId: req.userId, phone: req.body.phone } });
    res.json({ success: true });
  } catch(e) { res.status(500).json({error: "DB fault"}) }
});

app.delete("/api/blocked/:phone", authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.blockedNumber.deleteMany({ where: { phone: req.params.phone, ...(req.userRole !== "admin" && { userId: req.userId }) } });
    res.json({ success: true });
  } catch(e) { res.json({ success: false }) }
});


// ======================= DEVICES =======================

app.get("/api/devices", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const devices = await prisma.device.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId } });
    res.json(devices);
  } catch(e) { res.json([]) }
});

app.post("/api/devices", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const device = await prisma.device.create({
      data: { userId: req.userId, name: req.body.name || "WhatsApp Device", status: "qr_ready" }
    });
    startSession(device.id);
    res.json(device);
  } catch(e) { res.status(500).json({error: "DB fault"}) }
});

app.delete("/api/devices/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const d = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (d && d.userId !== req.userId && req.userRole !== "admin") return res.status(403).json({ error: "Unauthorized" });
    await deleteSession(req.params.id);
    res.json({ success: true });
  } catch(e) { res.json({ success: false }) }
});

// 1. Image Generation endpoint using gemini-3-pro-image-preview
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, size = "1K", aspectRatio = "1:1" } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required to generate an image." });
    }

    const ai = getAIClient();
    
    // Call generateContent with gemini-3-pro-image-preview
    // Size config accepts 1K, 2K, 4K for gemini-3-pro-image-preview
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: size, // "1K", "2K", "4K"
        },
      },
    });

    // Extract the image from candidates
    let imageBase64 = "";
    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!imageBase64) {
      return res.status(500).json({ 
        error: "No image was returned by the AI model. Try adjusting your prompt and try again." 
      });
    }

    res.json({ 
      imageUrl: `data:image/png;base64,${imageBase64}` 
    });
  } catch (error: any) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: error.message || "An error occurred during image generation." });
  }
});

// 2. Chat endpoint supporting conversational chat assistant & bot rule testing
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, model = "gemini-3.6-flash" } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getAIClient();

    // Map conversation array to Gemini API Content parts
    const contents = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: model, // e.g., "gemini-3.6-flash" for general tasks
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I was unable to formulate a response. Please try again.";
    res.json({ reply });
  } catch (error: any) {
    console.error("Error in chat api:", error);
    res.status(500).json({ error: error.message || "An error occurred during chat generation." });
  }
});

// 3. Translation helper endpoint
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: "Text and targetLanguage are required for translation." });
    }

    const ai = getAIClient();

    const prompt = `Translate the following WhatsApp message template into ${targetLanguage}. 
IMPORTANT RULES:
1. Maintain the precise message tone and formatting (bold *word*, italic _word_, strikethrough ~word~, bullet points, and emojis).
2. DO NOT translate dynamic placeholders like {name}, {email}, {order_number}, {phone}, etc. Leave them EXACTLY as they are.
3. Return ONLY the translated message text. Do not add any introduction, explanations, or quotes.

Message to translate:
${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const translatedText = response.text || text;
    res.json({ translatedText: translatedText.trim() });
  } catch (error: any) {
    console.error("Error translating text:", error);
    res.status(500).json({ error: error.message || "An error occurred during translation." });
  }
});

// 4. WhatsApp Baileys endpoint (for a single, manual send)
app.post("/api/whatsapp/send", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { phone, message, type = "text", imageUrl } = req.body;
    if (!isNonEmptyString(phone, 32) || typeof message !== "string" || !["text", "image", "document", "video"].includes(type)) {
      return res.status(400).json({ error: "Invalid WhatsApp message payload." });
    }
    
    const connectedDevices = await prisma.device.findMany({ where: { status: "connected", userId: req.userId } });
    if (connectedDevices.length === 0) return res.status(400).json({ error: "No connected WhatsApp devices available." });
    
    const randomDevice = connectedDevices[Math.floor(Math.random() * connectedDevices.length)];
    const sock = activeSockets.get(randomDevice.id);
    if (!sock) return res.status(500).json({ error: `Socket not found for device ${randomDevice.name}` });

    const jid = `${phone.replace(/[^\\d]/g, "")}@s.whatsapp.net`;
    let mediaBuffer: Buffer | undefined;
    if (imageUrl && imageUrl.startsWith("data:")) {
       const match = imageUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\\s]+)$/);
       if (match) mediaBuffer = Buffer.from(match[2].replace(/\\s/g, ""), "base64");
    }

    if (type === "text") {
       await sock.sendMessage(jid, { text: message });
    } else if (type === "image") {
       await sock.sendMessage(jid, { image: mediaBuffer || { url: imageUrl }, caption: message });
    } else if (type === "document") {
       await sock.sendMessage(jid, { document: mediaBuffer || { url: imageUrl }, caption: message, mimetype: "application/pdf" }); 
    } else if (type === "video") {
       await sock.sendMessage(jid, { video: mediaBuffer || { url: imageUrl }, caption: message });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error sending WhatsApp message:", error);
    res.status(500).json({ error: error.message || "An error occurred during sending." });
  }
});

app.post("/api/whatsapp/check", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { deviceId, numbers } = req.body;
    if (!deviceId || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ error: "Missing deviceId or numbers array" });
    }

    const device = await prisma.device.findUnique({ where: { id: deviceId, userId: req.userId } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    // Use the manager to check numbers
    const { checkWhatsAppNumbers } = await import("./whatsapp-manager");
    const results = await checkWhatsAppNumbers(deviceId, numbers);
    
    return res.json({ results });
  } catch (error: any) {
    console.error("Error checking WhatsApp numbers:", error);
    res.status(500).json({ error: "Failed to check numbers" });
  }
});

let deliveryWorkerBusy = false;
async function recoverStaleDeliveryJobs() {
  const staleBefore = new Date(Date.now() - 5 * 60_000);
  await prisma.deliveryJob.updateMany({
    where: { status: "processing", lockedAt: { lt: staleBefore } },
    data: { status: "pending", lockedAt: null },
  });
}

async function processNextDeliveryJob() {
  if (deliveryWorkerBusy) return;
  deliveryWorkerBusy = true;
  let jobProcessed = false;

  try {
    const job = await prisma.deliveryJob.findFirst({
      where: { status: "pending", availableAt: { lte: new Date() } },
      orderBy: [{ availableAt: "asc" }, { id: "asc" }],
    });
    if (!job) return;
    jobProcessed = true;
    const claim = await prisma.deliveryJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "processing", lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claim.count !== 1) return;

    const payload = JSON.parse(job.payload) as DeliveryPayload;
    const campaign = await prisma.campaign.findUnique({ where: { id: job.campaignId } });
    if (!campaign) {
      await prisma.deliveryJob.update({ where: { id: job.id }, data: { status: "failed", completedAt: new Date(), lockedAt: null, lastError: "Campaign no longer exists." } });
      return;
    }
    const details = parseCampaignData(campaign.data) as Record<string, any>;
    const blocked = await prisma.blockedNumber.findFirst({ where: { phone: payload.phone, userId: campaign.userId } });
    let finalStatus: "sent" | "failed" | "skipped" = "sent";
    let errorMessage: string | null = null;
    let sendRes: any;
    try {
      if (blocked) {
        finalStatus = "skipped";
        errorMessage = "Recipient opted out.";
      } else {
        let connectedDevices = await prisma.device.findMany({ where: { status: "connected", userId: campaign.userId } });
        if (connectedDevices.length === 0) throw new Error("No connected WhatsApp devices available.");
        
        if (details.deviceId) {
           const targetDevice = connectedDevices.find(d => d.id === details.deviceId);
           if (!targetDevice) throw new Error("The selected device is not connected or does not exist.");
           connectedDevices = [targetDevice];
        }

        const randomDevice = connectedDevices[Math.floor(Math.random() * connectedDevices.length)];
        const sock = activeSockets.get(randomDevice.id);
        if (!sock) throw new Error(`Socket not found for device ${randomDevice.name}`);

        const jid = `${payload.phone.replace(/[^\d]/g, "")}@s.whatsapp.net`;
        
        // Verify number exists on WhatsApp
        try {
            const [result] = await sock.onWhatsApp(jid);
            if (!result || !result.exists) {
                console.warn(`WhatsApp says ${jid} does not exist. Skipping to prevent ban.`);
                throw new Error("Phone number is not registered on WhatsApp.");
            }
        } catch (err: any) {
            if (err.message === "Phone number is not registered on WhatsApp.") {
                throw err;
            }
            console.error("onWhatsApp error:", err);
        }

        const attachmentUrl = details.attachmentUrl;
        
        let mediaBuffer: Buffer | undefined;
        if (attachmentUrl && attachmentUrl.startsWith("data:")) {
            const base64Data = attachmentUrl.split(',')[1];
            mediaBuffer = Buffer.from(base64Data, 'base64');
        } else if (attachmentUrl) {
            console.warn("External URLs not fully supported yet without fetch");
        }
        
        console.log(`[Bulk Sender] Preparing to send to ${jid} using device ${randomDevice.name}`);
        
        // Sometimes sending presence helps wake up the connection for a new chat
        try {
          await sock.presenceSubscribe(jid);
          await sock.sendPresenceUpdate('composing', jid);
          // Realistic typing delay: 50ms per character, min 1s, max 3.5s
          const typingDelay = Math.min(Math.max(1000, payload.message.length * 50), 3500);
          await new Promise(r => setTimeout(r, typingDelay));
        } catch (e) {
          console.warn("Presence update failed:", e);
        }

        if (payload.type === "text") {
           sendRes = await sock.sendMessage(jid, { text: payload.message });
        } else if (payload.type === "image") {
           sendRes = await sock.sendMessage(jid, { image: mediaBuffer || { url: attachmentUrl! }, caption: payload.message });
        } else if (payload.type === "document") {
           sendRes = await sock.sendMessage(jid, { document: mediaBuffer || { url: attachmentUrl! }, mimetype: details.mimeType || "application/pdf", fileName: details.fileName || "document", caption: payload.message });
        } else if (payload.type === "video") {
           sendRes = await sock.sendMessage(jid, { video: mediaBuffer || { url: attachmentUrl! }, caption: payload.message });
        } else if (payload.type === "audio") {
           sendRes = await sock.sendMessage(jid, { audio: mediaBuffer || { url: attachmentUrl! }, ptt: true });
        }
        
        console.log(`[Bulk Sender] SendMessage resolved for ${jid}. Message ID:`, sendRes?.key?.id);
      }
    } catch (error: any) {
      errorMessage = error.message || "WhatsApp delivery failed.";
      
      // Do not retry if account is restricted or missing tctoken (anti-spam block from WhatsApp)
      const isRestricted = errorMessage.toLowerCase().includes("restricted") || errorMessage.toLowerCase().includes("463");
      
      if (!isRestricted && job.attempts + 1 < 3) {
        const retryAt = new Date(Date.now() + (job.attempts + 1) * 30_000);
        await prisma.deliveryJob.update({ where: { id: job.id }, data: { status: "pending", availableAt: retryAt, lockedAt: null, lastError: errorMessage } });
        return;
      }
      finalStatus = "failed";
    }

    await prisma.deliveryJob.update({ 
      where: { id: job.id }, 
      data: { 
        status: finalStatus, 
        completedAt: new Date(), 
        lockedAt: null, 
        lastError: errorMessage,
        ...(sendRes?.key?.id ? { messageId: sendRes.key.id } : {})
      } 
    });
    const sentCount = Number(details.sentCount || 0) + (finalStatus === "sent" ? 1 : 0);
    const failCount = Number(details.failCount || 0) + (finalStatus === "failed" || finalStatus === "skipped" ? 1 : 0);
    const logs = Array.isArray(details.logs) ? details.logs : [];
    logs.unshift(`[${new Date().toISOString()}] ${finalStatus.toUpperCase()} ${payload.phone}${errorMessage ? `: ${errorMessage}` : ""}`);
    const outstanding = await prisma.deliveryJob.count({ where: { campaignId: job.campaignId, status: { in: ["pending", "processing"] } } });
    await prisma.campaign.update({
      where: { id: job.campaignId },
      data: { status: outstanding === 0 ? "completed" : "sending", data: JSON.stringify({ ...details, sentCount, failCount, logs: logs.slice(0, 1000) }) },
    });
  } catch (error) {
    console.error("Delivery worker error:", error);
  } finally {
    if (jobProcessed) {
      // Random delay between 4 to 12 seconds to simulate human behavior
      const randomDelayMs = Math.floor(Math.random() * (12000 - 4000 + 1)) + 4000;
      console.log(`[Bulk Sender] Waiting for ${randomDelayMs / 1000} seconds before next message...`);
      setTimeout(() => {
        deliveryWorkerBusy = false;
      }, randomDelayMs);
    } else {
      deliveryWorkerBusy = false;
    }
  }
}

// A database-backed worker: queued jobs survive browser reloads and server restarts.
void recoverStaleDeliveryJobs().catch(error => console.error("Unable to recover delivery jobs:", error));
setInterval(() => { void processNextDeliveryJob(); }, 1_000);
setInterval(() => { void recoverStaleDeliveryJobs().catch(error => console.error("Unable to recover delivery jobs:", error)); }, 60_000);

// 5. Google Maps Extractor API
app.post("/api/maps/extract", async (req, res) => {
  try {
    const { query, location } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "GOOGLE_MAPS_API_KEY is not configured in secrets." });
    }

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + location)}&key=${apiKey}`);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(data.error_message || "Failed to fetch from Google Maps API");
    }

    const results = [];
    // Limit to 15 to avoid massive API cost during test
    for (const place of (data.results || []).slice(0, 15)) {
       const detailsRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,formatted_address,website&key=${apiKey}`);
       const detailsData = await detailsRes.json();
       if (detailsData.result) {
         results.push({
           name: detailsData.result.name || "Unknown",
           phone: detailsData.result.formatted_phone_number || "N/A",
           address: detailsData.result.formatted_address || "N/A",
           website: detailsData.result.website || "N/A"
         });
       }
    }

    res.json({ results });
  } catch (error: any) {
    console.error("Error extracting maps data:", error);
    res.status(500).json({ error: error.message || "An error occurred during maps extraction." });
  }
});

// ======================= LIVE SUPPORT ENDPOINTS =======================

// User: Get their own messages
app.get("/api/support", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const messages = await prisma.supportMessage.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' }
    });
    // Mark admin messages as read since the user fetched them
    await prisma.supportMessage.updateMany({
      where: { userId: req.userId, isAdmin: true, isRead: false },
      data: { isRead: true }
    });
    res.json(messages);
  } catch(e) { res.status(500).json({ error: "Failed to load messages" }); }
});

// User: Send a message to Admin
app.post("/api/support", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Empty message" });
    const message = await prisma.supportMessage.create({
      data: { userId: req.userId!, text: text.trim(), isAdmin: false }
    });
    res.json(message);
  } catch(e) { res.status(500).json({ error: "Failed to send message" }); }
});

// Admin: Get all users with support messages
app.get("/api/admin/support", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // We fetch unique users who have sent or received messages
    const usersWithMessages = await prisma.user.findMany({
      where: { supportMessages: { some: {} } },
      select: {
        id: true, name: true, email: true,
        supportMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { supportMessages: { where: { isAdmin: false, isRead: false } } }
        }
      }
    });
    res.json(usersWithMessages.map(u => ({
      ...u,
      isOnline: onlineUsers.has(u.id)
    })));
  } catch(e) { res.status(500).json({ error: "Failed to load support users" }); }
});

// Admin: Get messages for a specific user
app.get("/api/admin/support/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const messages = await prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    // Mark user messages as read since admin fetched them
    await prisma.supportMessage.updateMany({
      where: { userId, isAdmin: false, isRead: false },
      data: { isRead: true }
    });
    res.json(messages);
  } catch(e) { res.status(500).json({ error: "Failed to load user messages" }); }
});

// Admin: Send a message to a user
app.post("/api/admin/support/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Empty message" });
    const message = await prisma.supportMessage.create({
      data: { userId, text: text.trim(), isAdmin: true }
    });
    res.json(message);
  } catch(e) { res.status(500).json({ error: "Failed to send message" }); }
});

// Setup Vite Dev server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  await initWhatsAppManager();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
