import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Cubic = [number, number, number, number, number, number, number, number];

/** Approximate length of a cubic Bézier, so a stroke can be "drawn" with a dash offset. */
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

const cubic = ([x0, y0, x1, y1, x2, y2, x3, y3]: Cubic) => `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
const line = (x: number, y0: number, y1: number): Cubic => [x, y0, x, y0, x, y1, x, y1];

// Same geometry as the app icon (assets/brand/mark.svg): the letter ה whose roof is a brow arch.
const ARCH_TOP: Cubic = [300, 468, 400, 352, 590, 316, 736, 384];
const ARCH_BOTTOM: Cubic = [300, 468, 424, 388, 596, 372, 736, 436];
const ARCH_FILL = 'M 300 468 C 400 352, 590 316, 736 384 L 736 436 C 596 372, 424 388, 300 468 Z';
const HAIRS: Cubic[] = [
  [392, 392, 398, 374, 405, 362, 414, 350],
  [452, 362, 459, 345, 467, 334, 477, 324],
  [515, 345, 523, 330, 532, 321, 543, 314],
  [580, 340, 589, 328, 598, 322, 610, 318],
  [642, 346, 652, 338, 662, 335, 674, 334],
];

function Stroke({
  c,
  width,
  opacity = 1,
  delay,
  duration,
  color,
}: {
  c: Cubic;
  width: number;
  opacity?: number;
  delay: number;
  duration: number;
  color: string;
}) {
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
      d={cubic(c)}
      stroke={color}
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
 * Signature animation of the studio's mark: the brow arch is sketched like a
 * pencil outline and then filled in, the legs of the ה are drawn, and the fine
 * hairs appear last. Afterwards it breathes slowly. Respects Reduce Motion.
 */
export function BrowMark({
  width = 160,
  style,
  color = colors.accent,
}: {
  width?: number;
  style?: StyleProp<ViewStyle>;
  /** Override the brand colour, e.g. white on the dark hero. */
  color?: string;
}) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    // Drawn once, then it stays still (no looping "breathing").
    fill.set(withDelay(950, withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) })));
  }, [fill, reduce]);
  const fillProps = useAnimatedProps(() => ({ fillOpacity: fill.value }));

  return (
    <View
      style={[{ width, aspectRatio: 470 / 430 }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <View style={{ flex: 1 }}>
        <Svg width="100%" height="100%" viewBox="283 296 470 430">
          <Stroke c={ARCH_TOP} width={5} delay={0} duration={1000} color={color} />
          <Stroke c={ARCH_BOTTOM} width={5} delay={120} duration={1000} color={color} />
          <AnimatedPath d={ARCH_FILL} fill={color} animatedProps={fillProps} />
          <Stroke c={line(716, 420, 708)} width={40} delay={900} duration={650} color={color} />
          <Stroke c={line(340, 548, 708)} width={40} delay={1200} duration={500} color={color} />
          {HAIRS.map((c, i) => (
            <Stroke key={i} c={c} width={9} opacity={0.6} delay={1500 + i * 90} duration={380} color={color} />
          ))}
        </Svg>
      </View>
    </View>
  );
}
