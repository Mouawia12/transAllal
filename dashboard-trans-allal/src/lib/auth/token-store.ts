import { dashboardRuntimeConfig } from "@/lib/api/config";

const storageKey = dashboardRuntimeConfig.authStorageKey;

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const dashboardTokenStore = {
  get() {
    if (!hasBrowserStorage()) {
      return null;
    }

    return window.localStorage.getItem(storageKey);
  },
  set(token: string) {
    if (!hasBrowserStorage()) {
      return;
    }

    window.localStorage.setItem(storageKey, token);
  },
  clear() {
    if (!hasBrowserStorage()) {
      return;
    }

    window.localStorage.removeItem(storageKey);
  },
};
