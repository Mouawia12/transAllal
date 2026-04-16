import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  getRequiredSetupStatus,
  type RequiredSetupStatus,
} from '@/services/permissions/required-setup.service';

type UseRequiredSetupStatusResult = {
  status: RequiredSetupStatus | null;
  isLoading: boolean;
  refresh: () => Promise<RequiredSetupStatus | null>;
};

export function useRequiredSetupStatus(
  enabled = true,
): UseRequiredSetupStatusResult {
  const [status, setStatus] = useState<RequiredSetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStatus(null);
      setIsLoading(false);
      return null;
    }

    const nextStatus = await getRequiredSetupStatus();
    setStatus(nextStatus);
    setIsLoading(false);
    return nextStatus;
  }, [enabled]);

  useEffect(() => {
    setIsLoading(enabled);
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refresh();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => subscription.remove();
  }, [enabled, refresh]);

  return {
    status,
    isLoading,
    refresh,
  };
}
