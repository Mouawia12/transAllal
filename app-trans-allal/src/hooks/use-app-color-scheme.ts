import { useColorScheme } from 'react-native';

export function useAppColorScheme() {
  return useColorScheme() ?? 'light';
}
