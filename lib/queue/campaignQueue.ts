import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runCampaign } from '../whatsapp/campaign-runner';

let connection: IORedis | null = null;
let campaignQueue: any = null;

try {
  connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: () => null, // Stop retrying endlessly if Redis is not installed
  });

  // Suppress unhandled ECONNREFUSED error spam when Redis is not installed
  connection.on('error', (err) => {
    // Silent catch for missing Redis server
  });

  campaignQueue = new Queue('Campaigns', { connection });

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
        concurrency: 1 
      } 
    );

    globalWorker.__worker.on('completed', (job) => {
      console.log(`Job ${job.id} has completed!`);
    });

    globalWorker.__worker.on('failed', (job, err) => {
      console.log(`Job ${job?.id} has failed with ${err.message}`);
    });

    globalWorker.__worker.on('error', () => {});
  }
} catch (e) {
  // Fallback for environment without Redis
  campaignQueue = {
    add: async (_name: string, data: { campaignId: number }) => {
      runCampaign(data.campaignId).catch(console.error);
      return { id: `direct-${Date.now()}` };
    }
  };
}

export { campaignQueue };
