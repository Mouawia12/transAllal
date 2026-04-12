import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type FormSectionProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
  content: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
