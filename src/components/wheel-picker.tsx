import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { colors, family, radius } from '@/theme';

export const WHEEL_ITEM_HEIGHT = 52;
const VISIBLE = 5; // odd, so one row sits exactly in the middle
const PAD = ((VISIBLE - 1) / 2) * WHEEL_ITEM_HEIGHT;

export type WheelItem = { key: string; label: string; caption?: string };

/**
 * iOS-style scroll wheel. The row in the middle band is the selection: it updates
 * live while scrolling (with a light haptic tick), rows fade and tilt away from the
 * centre, and the wheel snaps to a row when it stops. Tapping a row scrolls to it.
 */
export function WheelPicker({
  items,
  selectedKey,
  onChange,
  accessibilityLabel,
}: {
  items: WheelItem[];
  selectedKey: string | null;
  onChange: (key: string) => void;
  accessibilityLabel?: string;
}) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const lastIndex = useRef(-1);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIndex = Math.max(
    0,
    items.findIndex((i) => i.key === selectedKey),
  );

  const scrollToIndex = (index: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated });
  };

  // Put the wheel on the selected row when it first appears (or the list changes).
  useEffect(() => {
    const t = setTimeout(() => scrollToIndex(selectedIndex, false), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const onIndex = (index: number) => {
    if (index === lastIndex.current || !items[index]) return;
    lastIndex.current = index;
    haptics.select();
    onChange(items[index].key);
  };

  // Web has no native snapping, so settle on the nearest row shortly after scrolling stops.
  const scheduleSettle = (y: number) => {
    if (Platform.OS !== 'web') return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const index = Math.round(y / WHEEL_ITEM_HEIGHT);
      if (Math.abs(y - index * WHEEL_ITEM_HEIGHT) > 1) scrollToIndex(index);
    }, 140);
  };

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  useAnimatedReaction(
    () => Math.round(scrollY.value / WHEEL_ITEM_HEIGHT),
    (index, prev) => {
      if (index !== prev) scheduleOnRN(onIndex, Math.min(Math.max(index, 0), items.length - 1));
    },
  );
  useAnimatedReaction(
    () => scrollY.value,
    (y) => scheduleOnRN(scheduleSettle, y),
  );

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: items[selectedIndex]?.label }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = selectedIndex + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
        if (items[next]) scrollToIndex(next);
      }}>
      <View pointerEvents="none" style={styles.band} />
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: PAD }}
        style={styles.scroll}>
        {items.map((item, i) => (
          <Row key={item.key} item={item} index={i} scrollY={scrollY} onPress={() => scrollToIndex(i)} />
        ))}
      </Animated.ScrollView>
      <LinearGradient pointerEvents="none" colors={[colors.background, `${colors.background}00`]} style={[styles.fade, styles.fadeTop]} />
      <LinearGradient pointerEvents="none" colors={[`${colors.background}00`, colors.background]} style={[styles.fade, styles.fadeBottom]} />
    </View>
  );
}

function Row({
  item,
  index,
  scrollY,
  onPress,
}: {
  item: WheelItem;
  index: number;
  scrollY: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const d = (scrollY.value - index * WHEEL_ITEM_HEIGHT) / WHEEL_ITEM_HEIGHT; // rows from centre
    const abs = Math.abs(d);
    return {
      opacity: interpolate(abs, [0, 1, 2, 3], [1, 0.55, 0.25, 0.1], Extrapolation.CLAMP),
      transform: [
        { perspective: 600 },
        { rotateX: `${interpolate(d, [-3, 0, 3], [55, 0, -55], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(abs, [0, 2], [1, 0.86], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Pressable onPress={onPress} accessible={false}>
      <Animated.View style={[styles.row, style]}>
        <Text style={styles.label}>{item.label}</Text>
        {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { height: WHEEL_ITEM_HEIGHT * VISIBLE, overflow: 'hidden', borderRadius: radius.lg },
  scroll: { flex: 1 },
  band: {
    position: 'absolute',
    top: PAD,
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  row: {
    height: WHEEL_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontFamily: family.semibold, fontSize: 24, color: colors.text, letterSpacing: 0.5 },
  caption: { fontFamily: family.regular, fontSize: 13, color: colors.textMuted, width: 52, textAlign: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, height: WHEEL_ITEM_HEIGHT * 0.9 },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
});
