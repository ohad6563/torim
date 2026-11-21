import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { dayNumber, WEEKDAYS_SHORT, weekdayOf } from '@/lib/dates';
import { colors, radius, spacing } from '@/theme';

/**
 * Row of days to pick from. `marked` days get a small dot.
 * With `fill`, the days share the full width (for a single week); otherwise the row scrolls.
 */
export function DateStrip({
  days,
  selected,
  onSelect,
  disabledDays,
  marked,
  fill,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
  disabledDays?: Set<string>;
  marked?: Set<string>;
  fill?: boolean;
}) {
  const items = days.map((day) => {
        const isSelected = day === selected;
        const disabled = disabledDays?.has(day);
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled }}
            style={({ pressed }) => [
              styles.day,
              fill && styles.dayFill,
              isSelected && styles.daySelected,
              disabled && styles.dayDisabled,
              pressed && { opacity: 0.7 },
            ]}>
            <Txt variant="tiny" bold color={isSelected ? colors.textOnPrimary : colors.textMuted}>
              {WEEKDAYS_SHORT[weekdayOf(day)]}
            </Txt>
            <Txt variant="h3" color={isSelected ? colors.textOnPrimary : colors.text}>
              {dayNumber(day)}
            </Txt>
            <View
              style={[
                styles.dot,
                { backgroundColor: marked?.has(day) ? (isSelected ? colors.textOnPrimary : colors.accent) : 'transparent' },
              ]}
            />
          </Pressable>
        );
  });

  if (fill) return <View style={styles.row}>{items}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  dayFill: { flex: 1, width: undefined },
  day: {
    width: 52,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayDisabled: { opacity: 0.35 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
