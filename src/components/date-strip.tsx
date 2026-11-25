import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { I18nManager, Platform, Pressable, ScrollView, StyleSheet, Text, View, type HostInstance, type ScrollViewInstance } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { dayNumber, formatDayLong, monthName, WEEKDAYS_SHORT, weekdayOf } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { colors, family, font, motion, radius, spacing, springs } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Row of days to pick from. `marked` days get a small dot; `fullDays` say "מלא" (still tappable, for the waitlist).
 * With `fill`, the days share the full width (for a single week); otherwise the row scrolls.
 */
export function DateStrip({
  days,
  selected,
  onSelect,
  disabledDays,
  marked,
  fullDays,
  fill,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
  disabledDays?: Set<string>;
  marked?: Set<string>;
  fullDays?: Set<string>;
  fill?: boolean;
}) {
  // A single highlight "pill" slides with a spring to the selected day. Its position comes
  // from the day's index (all cells share one width), which behaves the same on iOS,
  // Android and the web in right-to-left layout.
  const [rowW, setRowW] = useState(0);
  const cellW = fill ? (rowW - GAP * (days.length - 1)) / days.length : CELL_W;
  const index = Math.max(0, days.indexOf(selected));
  const target = DIR * index * (cellW + GAP);
  const pillX = useSharedValue(target);
  const ready = rowW > 0 && cellW > 0;

  // Place the pill without animation on the first real layout (cell width unknown before
  // that), then spring between days.
  const placed = useSharedValue(0);
  useEffect(() => {
    if (!ready) return;
    if (placed.get() === 0) {
      pillX.set(target);
      placed.set(1);
      return;
    }
    pillX.set(withSpring(target, springs.gentle));
  }, [target, pillX, ready, placed]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));
  const pill = ready ? (
    <Animated.View pointerEvents="none" style={[styles.pill, { width: cellW }, pillStyle]} />
  ) : null;

  const items = days.map((day, i) => (
    <Day
      key={day}
      day={day}
      fill={fill}
      selected={day === selected}
      disabled={!!disabledDays?.has(day)}
      marked={!!marked?.has(day)}
      full={!!fullDays?.has(day)}
      // Show the month name on the first day of a month (and at the start of a scrolling strip).
      month={!fill && (i === 0 || day.endsWith('-01')) ? monthName(day) : null}
      onPress={() => onSelect(day)}
    />
  ));

  if (fill)
    return (
      <View style={styles.row} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
        {pill}
        {items}
      </View>
    );
  return (
    <ScrollingStrip onContentLayout={setRowW}>
      {pill}
      {items}
    </ScrollingStrip>
  );
}

const CELL_W = 54;
const GAP = spacing.sm;
/** Next day is further to the left in RTL. The app always runs RTL (forced natively, dir="rtl" on web). */
const DIR = Platform.OS === 'web' || I18nManager.isRTL ? -1 : 1;

/**
 * Horizontal scroller. On the web (mouse, no swipe) it gets arrow buttons; the
 * browser handles RTL, so scrolling right shows earlier days and left later ones.
 */
function ScrollingStrip({ children, onContentLayout }: { children: React.ReactNode; onContentLayout: (w: number) => void }) {
  const ref = useRef<ScrollViewInstance>(null);
  const scrollBy = (dx: number) => {
    const node = (ref.current as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.();
    node?.scrollBy({ left: dx, behavior: 'smooth' });
  };
  const strip = (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={{ flex: 1 }}
      onContentSizeChange={(w) => onContentLayout(w)}>
      {children}
    </ScrollView>
  );
  if (Platform.OS !== 'web') return strip;
  return (
    <View style={styles.webRow}>
      <Pressable onPress={() => scrollBy(320)} accessibilityRole="button" accessibilityLabel="ימים קודמים" style={styles.arrow}>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
      {strip}
      <Pressable onPress={() => scrollBy(-320)} accessibilityRole="button" accessibilityLabel="ימים הבאים" style={styles.arrow}>
        <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function Day({
  day,
  selected,
  disabled,
  marked,
  full,
  fill,
  month,
  onPress,
}: {
  day: string;
  selected: boolean;
  disabled: boolean;
  marked: boolean;
  full?: boolean;
  fill?: boolean;
  month: string | null;
  onPress: () => void;
}) {
  const wrapRef = useRef<HostInstance>(null);
  // On the web, keep the selected day visible (the browser handles RTL correctly).
  useEffect(() => {
    if (!selected || fill || Platform.OS !== 'web') return;
    const node = wrapRef.current as unknown as HTMLElement | null;
    node?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [selected, fill]);

  // Text colour cross-fades as the pill arrives; a press gives a small spring.
  const on = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: motion.fast }));
  }, [selected, on]);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(on.value, [0, 1], [colors.border, 'transparent']),
    // Unselected days are cards; the selected one is see-through so the sliding pill shows.
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.surface, 'transparent']),
  }));
  const numberColor = useAnimatedStyle(() => ({ color: interpolateColor(on.value, [0, 1], [colors.text, colors.textOnPrimary]) }));
  const weekdayColor = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [colors.textMuted, colors.textOnPrimary]),
  }));
  const dotColor = useAnimatedStyle(() => ({
    backgroundColor: marked ? interpolateColor(on.value, [0, 1], [colors.text, colors.textOnPrimary]) : 'transparent',
  }));

  return (
    <View ref={wrapRef} style={fill ? styles.fillWrap : undefined}>
      <Text style={styles.month} numberOfLines={1}>
        {month ?? ' '}
      </Text>
      <AnimatedPressable
        onPress={() => {
          haptics.select();
          onPress();
        }}
        onPressIn={() => {
          scale.set(withSpring(0.9, springs.press));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, springs.bouncy));
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={full ? `${formatDayLong(day)}, מלא` : formatDayLong(day)}
        accessibilityState={{ selected, disabled }}
        style={[styles.day, fill && styles.dayFill, disabled && styles.dayDisabled, pressStyle]}>
        <Animated.Text style={[styles.weekday, weekdayColor]}>{WEEKDAYS_SHORT[weekdayOf(day)]}</Animated.Text>
        <Animated.Text style={[styles.number, numberColor]}>{dayNumber(day)}</Animated.Text>
        {full ? (
          <Animated.Text style={[styles.full, weekdayColor]}>מלא</Animated.Text>
        ) : (
          <Animated.View style={[styles.dot, dotColor]} />
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  // Anchored at the start edge (right in RTL) under the day cells; moved by translateX.
  pill: {
    position: 'absolute',
    // Native RTL maps `start` to the right edge; react-native-web doesn't (the page is RTL via CSS), so pin it there.
    ...(Platform.OS === 'web' ? { right: 0 } : { start: 0 }),
    top: spacing.xs + 18,
    bottom: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  webRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  arrow: { width: 44, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  fillWrap: { flex: 1, minWidth: 0 },
  month: { fontFamily: family.medium, fontSize: font.tiny, color: colors.textFaint, height: 18, textAlign: 'center' },
  day: {
    width: 54,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 2,
  },
  // 'auto', not undefined: undefined doesn't override the fixed width above when styles merge.
  dayFill: { width: 'auto', minWidth: 0 },
  dayDisabled: { opacity: 0.25 },
  weekday: { fontFamily: family.medium, fontSize: font.tiny },
  number: { fontFamily: family.semibold, fontSize: font.h3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  full: { fontFamily: family.medium, fontSize: 9, lineHeight: 10, height: 10, marginTop: -3 },
});
