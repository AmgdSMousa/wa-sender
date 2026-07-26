import { runCampaign } from '../whatsapp/campaign-runner';

export const campaignQueue = {
  add: async (_name: string, data: { campaignId: number }) => {
    runCampaign(data.campaignId).catch((err) => console.error('Direct runCampaign error:', err));
    return { id: `direct-${Date.now()}` };
  }
};
