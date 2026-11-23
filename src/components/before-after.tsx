import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import type { BeforeAfterItem } from '@/lib/media';
import { colors, family, radius, spacing } from '@/theme';

/**
 * Interactive before/after: drag the handle (or tap anywhere) to reveal the
 * "before" photo over the "after" one. Plays a short hint sweep the first time.
 * Laid out left-to-right on purpose (before on the left), also in the RTL app.
 */
export function BeforeAfter({ item }: { item: BeforeAfterItem }) {
  const [width, setWidth] = useState(0);
  const pos = useSharedValue(0.5); // share of the width showing "before"
  const reduce = useReducedMotion();

  // Hint: sweep once so people see it's draggable.
  useEffect(() => {
    if (!width || reduce) return;
    pos.set(
      withDelay(
        600,
        withSequence(
          withTiming(0.78, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0.22, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
        ),
      ),
    );
  }, [width, reduce, pos]);

  // Drag runs on the UI thread (gesture handler + Reanimated), so it tracks the finger exactly.
  const widthSV = useSharedValue(0);
  const startPos = useSharedValue(0.5);
  const tick = () => haptics.select();
  const pan = usePanGesture({
    activeOffsetX: [-6, 6],
    failOffsetY: [-12, 12], // vertical swipes keep scrolling the page
    onBegin: (e) => {
      const w = widthSV.value || 1;
      startPos.set(Math.max(0.02, Math.min(0.98, e.x / w)));
      pos.set(withTiming(startPos.value, { duration: 120 }));
    },
    onUpdate: (e) => {
      // The line follows the finger directly.
      const w = widthSV.value || 1;
      const next = Math.max(0.02, Math.min(0.98, e.x / w));
      if (!Number.isFinite(next)) return;
      // Light tick when crossing the middle.
      if ((pos.value - 0.5) * (next - 0.5) < 0) scheduleOnRN(tick);
      pos.set(next);
    },
  });

  const beforeClip = useAnimatedStyle(() => ({ width: pos.value * width }));
  const handle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * width - 22 }] }));

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={pan}>
      <View
        style={styles.frame}
        onLayout={(e) => {
          widthSV.set(e.nativeEvent.layout.width);
          setWidth(e.nativeEvent.layout.width);
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`לפני ואחרי: ${item.title}${item.illustration ? ', המחשה' : ''}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => pos.set(withTiming(e.nativeEvent.actionName === 'increment' ? 0.9 : 0.1))}>
        {/* Images ignore touches: on the web, an <img> would otherwise start a native image drag and cancel the gesture. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image source={item.after} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <Animated.View style={[styles.beforeClip, beforeClip]}>
            <Image source={item.before} style={{ width, height: '100%' }} contentFit="cover" />
          </Animated.View>
        </View>

        <Animated.View style={[styles.handleWrap, handle]} pointerEvents="none">
          <View style={styles.line} />
          <View style={styles.knob}>
            <Ionicons name="chevron-back" size={14} color={colors.textOnPrimary} />
            <Ionicons name="chevron-forward" size={14} color={colors.textOnPrimary} />
          </View>
        </Animated.View>

        <Text style={[styles.tag, styles.tagBefore]}>לפני</Text>
        <Text style={[styles.tag, styles.tagAfter]}>אחרי</Text>
        {item.illustration ? <Text style={styles.illustration}>המחשה</Text> : null}
      </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  frame: {
    direction: 'ltr',
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  beforeClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  handleWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#FFFFFF' },
  knob: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,7,0.55)',
    color: '#FFFFFF',
    fontFamily: family.medium,
    fontSize: 13,
  },
  tagBefore: { left: spacing.md },
  tagAfter: { right: spacing.md },
  illustration: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.8)',
    color: '#141210',
    fontFamily: family.medium,
    fontSize: 11,
  },
});
