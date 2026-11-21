import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Cubic = [number, number, number, number, number, number, number, number];

/** Approximate length of a cubic Bézier, so the stroke can be "drawn" with a dash offset. */
function cubicLength([x0, y0, x1, y1, x2, y2, x3, y3]: Cubic) {
  let len = 0;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= 40; i++) {
    const t = i / 40;
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

// A brow arch drawn as a few pencil strokes, plus fine hair strokes along it.
const STROKES: { c: Cubic; width: number; opacity: number; delay: number; duration: number }[] = [
  { c: [12, 74, 70, 22, 150, 14, 228, 50], width: 3.2, opacity: 1, delay: 0, duration: 1300 },
  { c: [20, 80, 80, 34, 152, 26, 222, 58], width: 1.4, opacity: 0.55, delay: 260, duration: 1200 },
  { c: [30, 86, 88, 46, 150, 38, 214, 64], width: 0.8, opacity: 0.3, delay: 480, duration: 1100 },
];
const HAIRS: Cubic[] = [
  [52, 52, 56, 44, 60, 38, 66, 32],
  [84, 40, 88, 32, 93, 27, 99, 23],
  [118, 33, 123, 26, 128, 22, 135, 19],
  [152, 31, 158, 26, 164, 24, 171, 23],
  [186, 36, 192, 33, 198, 32, 205, 33],
];

const d = ([x0, y0, x1, y1, x2, y2, x3, y3]: Cubic) => `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;

function Stroke({ c, width, opacity, delay, duration }: { c: Cubic; width: number; opacity: number; delay: number; duration: number }) {
  const length = cubicLength(c);
  const reduce = useReducedMotion();
  const progress = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    progress.set(withDelay(delay, withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) })));
  }, [delay, duration, progress, reduce]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  return (
    <AnimatedPath
      d={d(c)}
      stroke={colors.text}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={`${length} ${length}`}
      animatedProps={animatedProps}
    />
  );
}

/**
 * Signature animation: an eyebrow arch that draws itself like pencil strokes,
 * then keeps a slow, calm "breathing" glow. Respects the system Reduce Motion setting.
 */
export function BrowMark({ width = 240, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    breathe.set(withDelay(
      2000,
      withRepeat(withSequence(withTiming(0.55, { duration: 2200 }), withTiming(1, { duration: 2200 })), -1),
    ));
  }, [breathe, reduce]);
  const glow = useAnimatedStyle(() => ({ opacity: breathe.value }));

  return (
    <View style={[{ width, aspectRatio: 240 / 100 }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ flex: 1 }, glow]}>
        <Svg width="100%" height="100%" viewBox="0 0 240 100">
          {STROKES.map((s, i) => (
            <Stroke key={i} {...s} />
          ))}
          {HAIRS.map((c, i) => (
            <Stroke key={`h${i}`} c={c} width={1} opacity={0.45} delay={900 + i * 90} duration={500} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
