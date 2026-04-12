'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { realtimeClient } from '../../../lib/api/realtime-client';
import { tokenStore } from '../../../lib/auth/token-store';
import { useAuthStore } from '../../../lib/auth/auth-store';
import type { LiveDriver } from '../../../types/shared';

export default function TrackingPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const companyId = user?.companyId ?? '';
  const [mode, setMode] = useState<'live' | 'fleet'>('live');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [liveMap, setLiveMap] = useState<Record<string, LiveDriver>>({});

  const { data: initialLive } = useQuery({
    queryKey: ['tracking', 'live', companyId],
    queryFn: () => apiClient.get<{ data: LiveDriver[] }>(ENDPOINTS.TRACKING_LIVE, { companyId }),
    enabled: !!companyId && mode === 'live',
  });

  const { data: fleet } = useQuery({
    queryKey: ['tracking', 'fleet', companyId],
    queryFn: () => apiClient.get<{ data: LiveDriver[] }>(ENDPOINTS.TRACKING_FLEET, { companyId }),
    enabled: !!companyId && mode === 'fleet',
  });

  useEffect(() => {
    if (initialLive?.data) {
      const map: Record<string, LiveDriver> = {};
      initialLive.data.forEach(d => { map[d.driverId] = d; });
      setLiveMap(map);
    }
  }, [initialLive]);

  useEffect(() => {
    const token = tokenStore.getAccessToken();
    if (!token || !companyId) return;
    realtimeClient.connect(token);
    realtimeClient.subscribeToCompany(companyId);
    realtimeClient.onDriverLocation(update => {
      setLiveMap(prev => ({
        ...prev,
        [update.driverId]: {
          ...prev[update.driverId],
          driverId: update.driverId,
          lat: update.lat,
          lng: update.lng,
          speedKmh: update.speedKmh,
          heading: update.heading ?? null,
          lastSeenAt: update.recordedAt,
          isOnline: true,
          tripId: update.tripId,
        } as LiveDriver,
      }));
    });
    realtimeClient.onOnlineChanged(ev => {
      setLiveMap(prev => {
        if (!prev[ev.driverId]) return prev;
        return { ...prev, [ev.driverId]: { ...prev[ev.driverId], isOnline: ev.isOnline, lastSeenAt: ev.lastSeenAt } };
      });
    });
    return () => realtimeClient.disconnect();
  }, [companyId]);

  const displayDrivers = mode === 'live'
    ? Object.values(liveMap).filter(d => d.isOnline)
    : (fleet?.data ?? []);

  const selected = selectedDriver ? (liveMap[selectedDriver] ?? fleet?.data?.find(d => d.driverId === selectedDriver)) : null;

  return (
    <div className="flex h-full gap-4 -m-6 p-0 overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Sidebar */}
      <div className="w-72 shrink-0 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {(['live', 'fleet'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
              >
                {m === 'live' ? t('tracking.live_only') : t('tracking.fleet_overview')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayDrivers.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">{t('tracking.no_active_drivers')}</p>
          )}
          {displayDrivers.map(d => (
            <button
              key={d.driverId}
              onClick={() => setSelectedDriver(d.driverId)}
              className={`w-full text-start p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedDriver === d.driverId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full shrink-0 ${d.isOnline ? (d.tripId ? 'bg-green-500' : 'bg-yellow-400') : 'bg-gray-400'}`} />
                <span className="font-medium text-sm text-gray-900 dark:text-white">{d.firstName} {d.lastName}</span>
              </div>
              <div className="text-xs text-gray-400 ms-4">
                {d.isOnline ? (d.tripId ? t('tracking.in_trip') : t('tracking.standalone')) : t('tracking.offline')}
                {d.speedKmh != null && ` · ${d.speedKmh} km/h`}
              </div>
              {d.lastSeenAt && (
                <div className="text-xs text-gray-300 ms-4">{new Date(d.lastSeenAt).toLocaleTimeString()}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-gray-400">
          {/* Map placeholder — replace with react-map-gl Mapbox component when MAPBOX_TOKEN is set */}
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Map View</p>
            <p className="text-sm">{displayDrivers.length} {mode === 'live' ? t('tracking.live_only') : t('tracking.fleet_overview')}</p>
            {selected && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow text-start text-sm">
                <p className="font-semibold">{selected.firstName} {selected.lastName}</p>
                <p>Lat: {selected.lat} · Lng: {selected.lng}</p>
                <p>{t('speed')}: {selected.speedKmh ?? '—'} km/h</p>
                <p>{t('last_seen')}: {selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleTimeString() : '—'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
