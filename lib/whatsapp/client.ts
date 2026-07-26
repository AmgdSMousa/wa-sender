import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { prisma } from '../prisma';
import { initWAService } from './bot';
import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

function getSafeClientId(sessionId: string) {
    if (/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
        return sessionId;
    }
    return crypto.createHash('md5').update(sessionId).digest('hex');
}

export interface WASessionState {
  client: Client | null;
  qrCodeData: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'qr';
  isInitializing: boolean;
  lastCrashTime?: number;
}

const globalForWA = globalThis as unknown as {
  sessions: Record<string, WASessionState>;
};

if (!globalForWA.sessions) {
  globalForWA.sessions = {};
}

function killOrphanBrowser(sessionId: string) {
  const safeId = getSafeClientId(sessionId);
  const sessionPath = join(process.cwd(), '.wwebjs_auth', `session-${safeId}`);
  try {
    execSync(`pkill -f "user-data-dir=${sessionPath}" 2>/dev/null || true`, { timeout: 1000 });
  } catch (_) { /* ignore */ }
  
  try {
    const lockFile = join(sessionPath, 'SingletonLock');
    if (existsSync(lockFile)) {
      rmSync(lockFile, { force: true });
    }
  } catch (_) { /* ignore */ }
}

export const getWAClient = (sessionId: string = 'default', force = false) => {
  if (!globalForWA.sessions[sessionId]) {
    globalForWA.sessions[sessionId] = {
      client: null,
      qrCodeData: null,
      connectionStatus: 'disconnected',
      isInitializing: false,
    };
  }
  
  let state = globalForWA.sessions[sessionId];

  if (state.client && !force && state.connectionStatus !== 'disconnected') {
    return state.client;
  }
  
  if (state.isInitializing && !force) {
    return null;
  }
  
  if (state.lastCrashTime && Date.now() - state.lastCrashTime < 10000 && !force) {
    return null;
  }

  if ((force || state.connectionStatus === 'disconnected') && state.client) {
    try {
      state.client.destroy();
    } catch (e) {}
    state.client = null;
  }

  state.isInitializing = true;
  state.connectionStatus = 'connecting';

  let chromePath: string | undefined = undefined;
  if (existsSync('/usr/bin/google-chrome')) {
    chromePath = '/usr/bin/google-chrome';
  } else if (existsSync('/usr/bin/chromium')) {
    chromePath = '/usr/bin/chromium';
  } else if (existsSync('/usr/bin/chromium-browser')) {
    chromePath = '/usr/bin/chromium-browser';
  }

  let client;
  try {
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: getSafeClientId(sessionId),
        dataPath: join(process.cwd(), '.wwebjs_auth'),
      }),
      puppeteer: {
        ...(chromePath ? { executablePath: chromePath } : {}),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--unhandled-rejections=strict'
        ],
        headless: true,
      },
    },
    webVersionCache: {
      type: 'local',
      strict: false,
    }
  });
  } catch (err) {
    console.error('Failed to instantiate WA Client:', err);
    state.isInitializing = false;
    state.connectionStatus = 'disconnected';
    throw err;
  }

  state.client = client;

  client.on('qr', async (qr) => {
    globalForWA.sessions[sessionId].qrCodeData = await qrcode.toDataURL(qr);
    globalForWA.sessions[sessionId].connectionStatus = 'qr';
    globalForWA.sessions[sessionId].isInitializing = false;
    
    try {
      await prisma.wASession.upsert({
        where: { sessionId },
        update: { status: 'scanning' },
        create: { sessionId, status: 'scanning' },
      });
    } catch (e) {}
  });

  client.on('loading_screen', () => {
    globalForWA.sessions[sessionId].connectionStatus = 'connecting';
  });

  client.on('ready', async () => {
    globalForWA.sessions[sessionId].qrCodeData = null;
    globalForWA.sessions[sessionId].connectionStatus = 'connected';
    globalForWA.sessions[sessionId].isInitializing = false;
    
    initWAService(client);
    
    try {
      await prisma.wASession.upsert({
        where: { sessionId },
        update: { status: 'connected' },
        create: { sessionId, status: 'connected' },
      });
    } catch (e) {}
  });

  client.on('auth_failure', async () => {
    globalForWA.sessions[sessionId].connectionStatus = 'disconnected';
    globalForWA.sessions[sessionId].isInitializing = false;
    globalForWA.sessions[sessionId].qrCodeData = null;
    globalForWA.sessions[sessionId].client = null;
    await prisma.wASession.upsert({
      where: { sessionId },
      update: { status: 'disconnected' },
      create: { sessionId, status: 'disconnected' },
    });
  });

  client.on('disconnected', async () => {
    globalForWA.sessions[sessionId].connectionStatus = 'disconnected';
    globalForWA.sessions[sessionId].isInitializing = false;
    globalForWA.sessions[sessionId].client = null;
    globalForWA.sessions[sessionId].qrCodeData = null;
    await prisma.wASession.upsert({
      where: { sessionId },
      update: { status: 'disconnected' },
      create: { sessionId, status: 'disconnected' },
    });
  });

  killOrphanBrowser(sessionId);
  client.initialize().then(() => {
    globalForWA.sessions[sessionId].lastCrashTime = 0;
  }).catch((err: any) => {
    globalForWA.sessions[sessionId].isInitializing = false;
    globalForWA.sessions[sessionId].connectionStatus = 'disconnected';
    globalForWA.sessions[sessionId].client = null;
    globalForWA.sessions[sessionId].lastCrashTime = Date.now();
  });

  return client;
};

export const getWAStatus = (sessionId: string = 'default') => {
  const state = globalForWA.sessions[sessionId];
  if (!state) return { status: 'disconnected', qr: null };
  return {
    status: state.connectionStatus || 'disconnected',
    qr: state.qrCodeData,
  };
};

export const disconnectWA = async (sessionId: string = 'default') => {
  const state = globalForWA.sessions[sessionId];
  if (state?.client) {
    try {
      await state.client.logout();
      await state.client.destroy();
      state.client = null;
      state.qrCodeData = null;
      state.connectionStatus = 'disconnected';
      state.isInitializing = false;
      
      await prisma.wASession.update({
        where: { sessionId },
        data: { status: 'disconnected' },
      });
    } catch (error) {
      state.client = null;
      state.connectionStatus = 'disconnected';
    }
  }
};
