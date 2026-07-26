import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.wASession.findMany().then(d => { console.log(d); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })
