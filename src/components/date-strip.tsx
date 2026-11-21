import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { dayNumber, monthName, WEEKDAYS_SHORT, weekdayOf } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { colors, family, font, radius, spacing, springs } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const items = days.map((day, i) => (
    <Day
      key={day}
      day={day}
      fill={fill}
      selected={day === selected}
      disabled={!!disabledDays?.has(day)}
      marked={!!marked?.has(day)}
      // Show the month name on the first day of a month (and at the start of a scrolling strip).
      month={!fill && (i === 0 || day.endsWith('-01')) ? monthName(day) : null}
      onPress={() => onSelect(day)}
    />
  ));

  if (fill) return <View style={styles.row}>{items}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items}
    </ScrollView>
  );
}

function Day({
  day,
  selected,
  disabled,
  marked,
  fill,
  month,
  onPress,
}: {
  day: string;
  selected: boolean;
  disabled: boolean;
  marked: boolean;
  fill?: boolean;
  month: string | null;
  onPress: () => void;
}) {
  const on = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: 220 }));
    if (selected) scale.set(withSpring(1, springs.bouncy));
  }, [selected, on, scale]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.surface, colors.primary]),
    borderColor: interpolateColor(on.value, [0, 1], [colors.border, colors.primary]),
    transform: [{ scale: scale.value }],
  }));
  const textColor = selected ? colors.textOnPrimary : colors.text;

  return (
    <View style={fill ? styles.fillWrap : undefined}>
      <Text style={styles.month} numberOfLines={1}>
        {month ?? ' '}
      </Text>
      <AnimatedPressable
        onPress={() => {
          haptics.select();
          onPress();
        }}
        onPressIn={() => {
          scale.set(withSpring(0.92, springs.press));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, springs.press));
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${WEEKDAYS_SHORT[weekdayOf(day)]} ${dayNumber(day)}`}
        accessibilityState={{ selected, disabled }}
        style={[styles.day, fill && styles.dayFill, disabled && styles.dayDisabled, style]}>
        <Text style={[styles.weekday, { color: selected ? colors.textOnPrimary : colors.textMuted }]}>
          {WEEKDAYS_SHORT[weekdayOf(day)]}
        </Text>
        <Text style={[styles.number, { color: textColor }]}>{dayNumber(day)}</Text>
        <View style={[styles.dot, { backgroundColor: marked ? textColor : 'transparent' }]} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  fillWrap: { flex: 1 },
  month: { fontFamily: family.medium, fontSize: font.tiny, color: colors.textFaint, height: 18, textAlign: 'center' },
  day: {
    width: 54,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  dayFill: { width: undefined },
  dayDisabled: { opacity: 0.25 },
  weekday: { fontFamily: family.medium, fontSize: font.tiny },
  number: { fontFamily: family.semibold, fontSize: font.h3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
