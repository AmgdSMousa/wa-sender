import { runCampaign } from '../whatsapp/campaign-runner';

let campaignQueue: any;

if (process.env.REDIS_URL) {
  try {
    const { Queue, Worker } = require('bullmq');
    const IORedis = require('ioredis');

    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    connection.on('error', () => {});

    campaignQueue = new Queue('Campaigns', { connection });

    const globalWorker = globalThis as unknown as { __worker?: any };
    if (typeof window === 'undefined' && !globalWorker.__worker && process.env.NODE_ENV !== 'test') {
      globalWorker.__worker = new Worker(
        'Campaigns',
        async (job: any) => {
          console.log(`Processing job ${job.id} for campaign ${job.data.campaignId}`);
          await runCampaign(job.data.campaignId);
        },
        { connection, concurrency: 1 }
      );
      globalWorker.__worker.on('error', () => {});
    }
  } catch (e) {
    campaignQueue = {
      add: async (_name: string, data: { campaignId: number }) => {
        runCampaign(data.campaignId).catch(console.error);
        return { id: `direct-${Date.now()}` };
      }
    };
  }
} else {
  // Direct in-memory execution fallback (No Redis required)
  campaignQueue = {
    add: async (_name: string, data: { campaignId: number }) => {
      runCampaign(data.campaignId).catch(console.error);
      return { id: `direct-${Date.now()}` };
    }
  };
}

export { campaignQueue };
