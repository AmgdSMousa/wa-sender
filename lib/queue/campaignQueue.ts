import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runCampaign } from '../whatsapp/campaign-runner';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const campaignQueue = new Queue('Campaigns', { connection });

// Only instantiate worker on standard server side, not in Edge/Browser.
// In a highly robust Next.js environment, it's better to separate workers 
// into a custom server wrapper or instrumentation.ts, but this functions as a basic queue worker.
const globalWorker = globalThis as unknown as { __worker?: Worker };

if (typeof window === 'undefined' && !globalWorker.__worker && process.env.NODE_ENV !== 'test') {
  globalWorker.__worker = new Worker(
    'Campaigns',
    async (job) => {
      console.log(`Processing job ${job.id} for campaign ${job.data.campaignId}`);
      await runCampaign(job.data.campaignId);
    },
    { 
      connection, 
      concurrency: 1 // Process one campaign at a time to avoid banning
    } 
  );

  globalWorker.__worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
  });

  globalWorker.__worker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} has failed with ${err.message}`);
  });
}
