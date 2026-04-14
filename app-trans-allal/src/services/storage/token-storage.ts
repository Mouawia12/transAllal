import * as SecureStore from 'expo-secure-store';
import { mobileRuntimeConfig } from '@/constants/env';
import { Platform } from 'react-native';

function toSecureStoreKey(suffix: string): string {
  const baseKey = mobileRuntimeConfig.authStorageKey.trim() || 'trans-allal-driver-token';
  const normalizedBaseKey = baseKey.replace(/[^A-Za-z0-9._-]/g, '_');
  const normalizedSuffix = suffix.replace(/[^A-Za-z0-9._-]/g, '_');
  return `${normalizedBaseKey}.${normalizedSuffix}`;
}

const KEY_ACCESS = toSecureStoreKey('access');
const KEY_REFRESH = toSecureStoreKey('refresh');

// SecureStore is not available on web — fall back to memory
const memStore: Record<string, string | null> = {};

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return memStore[key] ?? null;
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memStore[key] = value;
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDel(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memStore[key] = null;
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  async getAccess(): Promise<string | null> {
    return secureGet(KEY_ACCESS);
  },
  async setAccess(token: string): Promise<void> {
    return secureSet(KEY_ACCESS, token);
  },
  async getRefresh(): Promise<string | null> {
    return secureGet(KEY_REFRESH);
  },
  async setRefresh(token: string): Promise<void> {
    return secureSet(KEY_REFRESH, token);
  },
  async clearAll(): Promise<void> {
    await Promise.all([secureDel(KEY_ACCESS), secureDel(KEY_REFRESH)]);
  },
  // Legacy compat
  async get(): Promise<string | null> {
    return secureGet(KEY_ACCESS);
  },
  async set(token: string): Promise<void> {
    return secureSet(KEY_ACCESS, token);
  },
  async clear(): Promise<void> {
    return secureDel(KEY_ACCESS);
  },
};
