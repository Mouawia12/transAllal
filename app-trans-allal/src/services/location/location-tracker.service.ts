import { mobileRuntimeConfig } from '@/constants/env';

export const locationTracker = {
  async start() {
    throw new Error('Background tracking is not implemented yet.');
  },
  async stop() {
    return;
  },
  getStreamUrl() {
    return mobileRuntimeConfig.wsUrl;
  },
};
