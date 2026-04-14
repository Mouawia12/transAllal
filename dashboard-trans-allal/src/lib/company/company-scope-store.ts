'use client';

import { create } from 'zustand';

const LEGACY_STORAGE_KEY = 'trans-allal:selected-company-id';
const STORAGE_KEY = 'trans-allal:selected-company-id:v2';
export const companyScopeStorageKey = STORAGE_KEY;

type SelectedCompanyIdsByUser = Record<string, string>;

interface CompanyScopeState {
  selectedCompanyIds: SelectedCompanyIdsByUser;
  hydrated: boolean;
  hydrate: () => void;
  setSelectedCompanyId: (userId: string, companyId: string | null) => void;
}

function persistSelectedCompanyIds(selectedCompanyIds: SelectedCompanyIdsByUser) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(companyScopeStorageKey, JSON.stringify(selectedCompanyIds));
}

export const useCompanyScopeStore = create<CompanyScopeState>((set) => ({
  selectedCompanyIds: {},
  hydrated: false,
  hydrate: () => {
    if (typeof window === 'undefined') {
      set({ hydrated: true });
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(companyScopeStorageKey);
      const parsedValue = rawValue ? JSON.parse(rawValue) : {};
      const selectedCompanyIds =
        parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
          ? Object.entries(parsedValue).reduce<SelectedCompanyIdsByUser>(
              (accumulator, [userId, companyId]) => {
                if (typeof userId === 'string' && typeof companyId === 'string') {
                  accumulator[userId] = companyId;
                }

                return accumulator;
              },
              {},
            )
          : {};

      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      set({ selectedCompanyIds, hydrated: true });
    } catch {
      window.localStorage.removeItem(companyScopeStorageKey);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      set({ selectedCompanyIds: {}, hydrated: true });
    }
  },
  setSelectedCompanyId: (userId, companyId) => {
    set((state) => {
      const nextSelectedCompanyIds = { ...state.selectedCompanyIds };

      if (companyId) {
        nextSelectedCompanyIds[userId] = companyId;
      } else {
        delete nextSelectedCompanyIds[userId];
      }

      persistSelectedCompanyIds(nextSelectedCompanyIds);

      return { selectedCompanyIds: nextSelectedCompanyIds };
    });
  },
}));
