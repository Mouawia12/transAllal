import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type InfoCardProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function InfoCard({ title, description, children }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: appColors.light.card,
    borderColor: appColors.light.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  title: {
    color: appColors.light.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: appColors.light.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  body: {
    gap: spacing.xs,
  },
});
