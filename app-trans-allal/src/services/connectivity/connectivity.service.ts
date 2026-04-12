import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'trans_allal:offline_queue';

export interface QueuedRequest {
  id: string;
  path: string;
  method: string;
  body?: string;
  createdAt: string;
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function subscribeToConnectivity(
  callback: (online: boolean) => void,
): () => void {
  return NetInfo.addEventListener((state) => {
    callback(state.isConnected === true && state.isInternetReachable !== false);
  });
}

export async function enqueueRequest(req: Omit<QueuedRequest, 'id' | 'createdAt'>): Promise<void> {
  const existing = await loadQueue();
  existing.push({
    ...req,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
}

export async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function flushQueue(
  executor: (req: QueuedRequest) => Promise<void>,
): Promise<void> {
  const queue = await loadQueue();
  if (!queue.length) return;

  const failed: QueuedRequest[] = [];
  for (const req of queue) {
    try {
      await executor(req);
    } catch {
      failed.push(req);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
}
