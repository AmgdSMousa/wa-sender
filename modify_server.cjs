const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Add imports
code = code.replace(
  'import { initWhatsAppManager, startSession, deleteSession, activeSockets } from "./whatsapp-manager";',
  'import { initWhatsAppManager, startSession, deleteSession, activeSockets } from "./whatsapp-manager";\nimport bcrypt from "bcryptjs";\nimport jwt from "jsonwebtoken";\nimport { authenticateToken, requireAdmin, AuthRequest, generateToken } from "./auth";'
);

// Add Auth routes before DB ENDPOINTS
code = code.replace(
  '// ======================= DB ENDPOINTS =======================',
  `// ======================= AUTH ENDPOINTS =======================

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
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: "Login failed" }); }
});

// Admin-only stats endpoint
app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.count();
    const campaigns = await prisma.campaign.count();
    const devices = await prisma.device.count();
    const messages = await prisma.deliveryJob.count({ where: { status: "sent" } });
    res.json({ users, campaigns, devices, messages });
  } catch (e) { res.status(500).json({ error: "Failed to load stats" }); }
});

app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } });
    res.json(users);
  } catch (e) { res.status(500).json({ error: "Failed to load users" }); }
});

// ======================= DB ENDPOINTS =======================`
);

// Update endpoints to use AuthRequest
code = code.replace(/app\.get\("\/api\/campaigns", async \(req, res\) => {/g, 'app.get("/api/campaigns", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.post\("\/api\/campaigns", async \(req, res\) => {/g, 'app.post("/api/campaigns", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.post\("\/api\/campaigns\/:id\/dispatch", async \(req, res\) => {/g, 'app.post("/api/campaigns/:id/dispatch", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.get\("\/api\/campaigns\/:id\/progress", async \(req, res\) => {/g, 'app.get("/api/campaigns/:id/progress", authenticateToken, async (req: AuthRequest, res) => {');

// In GET campaigns
code = code.replace(
  'const data = await prisma.campaign.findMany({ orderBy: { createdAt: \'desc\' } });',
  'const data = await prisma.campaign.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId }, orderBy: { createdAt: \'desc\' } });'
);

// In POST campaigns
code = code.replace(
  'name: req.body.name.trim(),',
  'userId: req.userId,\n        name: req.body.name.trim(),'
);

// In POST dispatch (Check if campaign belongs to user)
code = code.replace(
  'const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });',
  'const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });\n    if (campaign && campaign.userId !== req.userId && req.userRole !== "admin") return res.status(403).json({ error: "Unauthorized" });'
);

// In GET progress
code = code.replace(
  'const grouped = await prisma.deliveryJob.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });',
  `const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || (campaign.userId !== req.userId && req.userRole !== "admin")) return res.status(403).json({ error: "Unauthorized" });
  const grouped = await prisma.deliveryJob.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });`
);

// Templates
code = code.replace(/app\.get\("\/api\/templates", async \(req, res\) => {/g, 'app.get("/api/templates", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.post\("\/api\/templates", async \(req, res\) => {/g, 'app.post("/api/templates", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.delete\("\/api\/templates\/:id", async \(req, res\) => {/g, 'app.delete("/api/templates/:id", authenticateToken, async (req: AuthRequest, res) => {');

code = code.replace(
  'const data = await prisma.template.findMany({ orderBy: { id: \'desc\' } });',
  'const data = await prisma.template.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId }, orderBy: { id: \'desc\' } });'
);
code = code.replace(
  'name: req.body.name,',
  'userId: req.userId,\n        name: req.body.name,'
);
code = code.replace(
  'await prisma.template.delete({ where: { id } });',
  'await prisma.template.deleteMany({ where: { id, ...(req.userRole !== "admin" && { userId: req.userId }) } });'
);

// Rules
code = code.replace(/app\.get\("\/api\/rules", async \(req, res\) => {/g, 'app.get("/api/rules", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.post\("\/api\/rules", async \(req, res\) => {/g, 'app.post("/api/rules", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.delete\("\/api\/rules\/:id", async \(req, res\) => {/g, 'app.delete("/api/rules/:id", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.patch\("\/api\/rules\/:id", async \(req, res\) => {/g, 'app.patch("/api/rules/:id", authenticateToken, async (req: AuthRequest, res) => {');

code = code.replace(
  'const rules = await prisma.rule.findMany();',
  'const rules = await prisma.rule.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId } });'
);
code = code.replace(
  'keyword: req.body.trigger.trim(),',
  'userId: req.userId,\n        keyword: req.body.trigger.trim(),'
);
code = code.replace(
  'await prisma.rule.delete({ where: { id } });',
  'await prisma.rule.deleteMany({ where: { id, ...(req.userRole !== "admin" && { userId: req.userId }) } });'
);
code = code.replace(
  'const rule = await prisma.rule.update({ where: { id }, data: { active: req.body.active } });',
  `const existing = await prisma.rule.findUnique({ where: { id } });
    if (!existing || (existing.userId !== req.userId && req.userRole !== "admin")) return res.status(403).json({ error: "Unauthorized" });
    const rule = await prisma.rule.update({ where: { id }, data: { active: req.body.active } });`
);

// Blocked
code = code.replace(/app\.get\("\/api\/blocked", async \(req, res\) => {/g, 'app.get("/api/blocked", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.post\("\/api\/blocked", async \(req, res\) => {/g, 'app.post("/api/blocked", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.delete\("\/api\/blocked\/:phone", async \(req, res\) => {/g, 'app.delete("/api/blocked/:phone", authenticateToken, async (req: AuthRequest, res) => {');

code = code.replace(
  'const data = await prisma.blockedNumber.findMany();',
  'const data = await prisma.blockedNumber.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId } });'
);
code = code.replace(
  'data: { phone: req.body.phone }',
  'data: { userId: req.userId, phone: req.body.phone }'
);
code = code.replace(
  'await prisma.blockedNumber.delete({ where: { phone: req.params.phone } });',
  'await prisma.blockedNumber.deleteMany({ where: { phone: req.params.phone, ...(req.userRole !== "admin" && { userId: req.userId }) } });'
);

// Devices
code = code.replace(/app\.get\("\/api\/devices", async \(req, res\) => {/g, 'app.get("/api/devices", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.post\("\/api\/devices", async \(req, res\) => {/g, 'app.post("/api/devices", authenticateToken, async (req: AuthRequest, res) => {');
code = code.replace(/app\.delete\("\/api\/devices\/:id", async \(req, res\) => {/g, 'app.delete("/api/devices/:id", authenticateToken, async (req: AuthRequest, res) => {');

code = code.replace(
  'const devices = await prisma.device.findMany();',
  'const devices = await prisma.device.findMany({ where: req.userRole === "admin" ? {} : { userId: req.userId } });'
);
code = code.replace(
  'data: { name: req.body.name || "WhatsApp Device", status: "qr_ready" }',
  'data: { userId: req.userId, name: req.body.name || "WhatsApp Device", status: "qr_ready" }'
);
code = code.replace(
  'await deleteSession(req.params.id);',
  `const d = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (d && d.userId !== req.userId && req.userRole !== "admin") return res.status(403).json({ error: "Unauthorized" });
    await deleteSession(req.params.id);`
);

// Worker processNextDeliveryJob update
code = code.replace(
  'const connectedDevices = await prisma.device.findMany({ where: { status: "connected" } });',
  'const connectedDevices = await prisma.device.findMany({ where: { status: "connected", userId: campaign.userId } });'
);

fs.writeFileSync('server.ts', code);
console.log('Modified server.ts successfully!');
