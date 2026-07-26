import { getWAClient } from './whatsapp/client';
import { initScheduler } from './scheduler';
import { prisma } from './prisma';

let isInitialized = false;

export const initApp = async () => {
  if (isInitialized) return;
  isInitialized = true;
  
  console.log('Initializing WA Sender application services...');
  
  try {
    const existingSessions = await prisma.wASession.findMany();
    if (existingSessions.length > 0) {
      // Re-initiate only existing saved sessions
      for (const s of existingSessions) {
        if (s.status === 'connected' || s.status === 'scanning') {
          getWAClient(s.sessionId);
        }
      }
    } else {
      // If no sessions exist in DB at all, initialize default
      getWAClient('default');
    }
  } catch (e) {
    getWAClient('default');
  }

  initScheduler();
};
