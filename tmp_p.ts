import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.template.findMany().then(r => { console.log('TEMPLATES OK:', r.length); return p.chatMessage.findMany(); })
  .then(r => { console.log('CHAT OK:', r.length); return p.webhookConfig.findMany(); })
  .then(r => { console.log('WEBHOOKS OK:', r.length); process.exit(0); })
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
