export interface AppSessionState {
  accessToken: string | null;
  driverId: string | null;
  lastSyncAt: string | null;
}

export const initialAppSessionState: AppSessionState = {
  accessToken: null,
  driverId: null,
  lastSyncAt: null,
};
