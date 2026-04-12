import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { appColors } from './colors';

export function createNavigationTheme(mode: 'light' | 'dark'): Theme {
  const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  const palette = appColors[mode];

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: palette.background,
      card: palette.card,
      text: palette.text,
      border: palette.border,
      primary: palette.primary,
      notification: palette.accent,
    },
  };
}
