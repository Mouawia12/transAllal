import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '@/theme/spacing';

export function MapPlaceholder() {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>tracking surface</Text>
      <Text style={styles.title}>Map provider slot</Text>
      <View style={styles.mapArea}>
        <Text style={styles.text}>
          This area is reserved for future live map rendering, trip polyline playback, and realtime driver location.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0c6b58',
    borderRadius: 24,
    gap: spacing.sm,
    padding: spacing.md,
  },
  eyebrow: {
    color: '#d8f4ec',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  mapArea: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    padding: spacing.md,
  },
  text: {
    color: '#eaf7f2',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
