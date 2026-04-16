import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { locationTracker } from '@/services/location/location-tracker.service';

/**
 * Returns the real device-level tracking state (not the server's isOnline flag).
 * Re-syncs whenever the app comes to the foreground.
 */
export function useTrackingState() {
  const [isTracking, setIsTracking] = useState(false);

  const sync = useCallback(async () => {
    const tracking = await locationTracker.isTracking();
    setIsTracking(tracking);
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  useFocusEffect(
    useCallback(() => {
      void sync();
    }, [sync]),
  );

  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') void sync();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [sync]);

  useEffect(() => {
    return locationTracker.subscribeToTrackingState(setIsTracking);
  }, []);

  return isTracking;
}
