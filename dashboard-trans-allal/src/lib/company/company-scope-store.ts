'use client';

import { create } from 'zustand';

const STORAGE_KEY = 'trans-allal:selected-company-id';

interface CompanyScopeState {
  selectedCompanyId: string | null;
  hydrated: boolean;
  hydrate: () => void;
  setSelectedCompanyId: (companyId: string | null) => void;
}

export const useCompanyScopeStore = create<CompanyScopeState>((set) => ({
  selectedCompanyId: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === 'undefined') {
      set({ hydrated: true });
      return;
    }

    const selectedCompanyId = window.localStorage.getItem(STORAGE_KEY);
    set({ selectedCompanyId, hydrated: true });
  },
  setSelectedCompanyId: (companyId) => {
    if (typeof window !== 'undefined') {
      if (companyId) {
        window.localStorage.setItem(STORAGE_KEY, companyId);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    set({ selectedCompanyId: companyId });
  },
}));
