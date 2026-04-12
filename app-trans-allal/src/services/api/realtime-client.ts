import { apiConfig } from './config';

export function createRealtimeClient(token?: string) {
  return {
    url: apiConfig.websocketUrl,
    token,
    connect() {
      throw new Error('Realtime client is scaffolded only. Implement transport next.');
    },
  };
}
