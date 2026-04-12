import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { createNavigationTheme } from '@/theme/navigation-theme';

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  const navigationTheme = createNavigationTheme(colorScheme);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(driver)" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
