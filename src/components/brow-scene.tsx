import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTilt } from '@/hooks/use-tilt';

/**
 * Hero background: a brow drawn hair by hair (like microblading) over the
 * brow-mapping guide lines artists draw. The brow itself stays still; only the thin
 * guide lines and marks drift a few pixels with the phone's tilt (or the mouse on the web).
 * With "Reduce Motion" on, it's a still picture.
 */
export function BrowScene({
  scrollY,
  style,
  overlay = 'full',
}: {
  scrollY?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  /** 'full': dark all over (sign-in); 'hero': lighter in the middle. */
  overlay?: 'full' | 'hero';
}) {
  const reduce = useReducedMotion();
  const tilt = useTilt();

  // Gentle idle sway so the scene is alive even when the phone is still.
  const idle = useSharedValue(0);
  // Hairs appear from the head of the brow to the tail.
  const drawn = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    idle.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true));
    drawn.set(withDelay(250, withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) })));
  }, [reduce, idle, drawn]);

  const tx = useDerivedValue(() => tilt.x.value + (idle.value - 0.5) * 0.5);
  const ty = useDerivedValue(() => tilt.y.value + (idle.value - 0.5) * 0.3);
  const parallax = useDerivedValue(() => (scrollY ? interpolate(scrollY.value, [-200, 0, 600], [-60, 0, 260]) : 0));

  // Only the scroll parallax moves the whole scene.
  const stage = useAnimatedStyle(() => ({ transform: [{ translateY: parallax.value }] }));
  const lightStyle = useAnimatedStyle(() => ({ transform: [{ translateY: parallax.value * 0.4 }] }));
  // The guide lines and marks drift a few pixels; the brow stays put.
  const guidesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value * -6 }, { translateY: ty.value * -4 }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, style]} pointerEvents="none">
      <LinearGradient colors={['#0B0807', '#1A120D', '#0B0807']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      {/* Studio light, swinging opposite to the tilt. */}
      <Animated.View style={[styles.light, lightStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="spot" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#E3C2B4" stopOpacity="0.32" />
              <Stop offset="0.45" stopColor="#C9A96E" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#C9A96E" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#spot)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, stage]}>
        <View style={[styles.browBox, { opacity: 0.55 }]}>
          <Animated.View style={[StyleSheet.absoluteFill, guidesStyle]}>
            <Guides drawn={drawn} />
          </Animated.View>
          <View style={StyleSheet.absoluteFill}>
            {BANDS.map((band, i) => (
              <Band key={i} index={i} hairs={band} drawn={drawn} />
            ))}
          </View>
        </View>
      </Animated.View>

      <LinearGradient
        colors={
          overlay === 'full'
            ? ['rgba(8,6,5,0.35)', 'rgba(8,6,5,0.15)', 'rgba(8,6,5,0.85)']
            : ['rgba(8,6,5,0.25)', 'rgba(8,6,5,0)', 'rgba(8,6,5,0.75)']
        }
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------- geometry (computed once) ----------

const VB = { w: 400, h: 220 };

/** Deterministic pseudo-random, so the brow looks the same on every render. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Brow outline: lower and upper edge at position t (0 = head, 1 = tail). */
function edges(t: number) {
  const x = 52 + t * 300;
  const arch = t < 0.66 ? Math.sin((t / 0.66) * (Math.PI / 2)) : Math.cos(((t - 0.66) / 0.34) * (Math.PI / 2));
  const lower = 150 - arch * 42 + (t > 0.66 ? (t - 0.66) * 30 : 0);
  const thickness = t < 0.15 ? 30 + t * 40 : 36 * (1 - Math.max(0, t - 0.55) * 1.9) + 4;
  return { x, lower, upper: lower - thickness };
}

type Hair = { d: string; w: number; light: boolean };
const BAND_COUNT = 12;

const BANDS: Hair[][] = (() => {
  const r = rng(7);
  const bands: Hair[][] = Array.from({ length: BAND_COUNT }, () => []);
  for (let i = 0; i < 340; i++) {
    const t = r();
    const { x, lower, upper } = edges(t);
    // Denser along the lower edge, like a real brow.
    const y = lower - Math.pow(r(), 1.4) * (lower - upper) * 0.8;
    // Hairs grow up at the head, then flow toward the tail, and dip down at its end.
    const flow = t < 0.1 ? -72 : t < 0.66 ? -72 + ((t - 0.1) / 0.56) * 46 : -26 + ((t - 0.66) / 0.34) * 34;
    const angle = flow + (r() - 0.5) * 9;
    const len = (t < 0.1 ? 13 : 24 - t * 13) * (0.75 + r() * 0.4);
    const a = (angle * Math.PI) / 180;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    // A slight curve toward the tail on every hair.
    const bend = 2 + r() * 2.5;
    const cx = (x + ex) / 2 + Math.sin(a) * bend;
    const cy = (y + ey) / 2 - Math.cos(a) * bend;
    const d = `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    bands[Math.min(BAND_COUNT - 1, Math.floor(t * BAND_COUNT))].push({ d, w: 0.55 + r() * 0.65, light: r() > 0.75 });
  }
  return bands;
})();

// ---------- layers ----------

/** One slice of the brow; the slices appear in turn, from the head to the tail. */
function Band({ index, hairs, drawn }: { index: number; hairs: Hair[]; drawn: SharedValue<number> }) {
  const center = (index + 0.5) / BAND_COUNT;
  const base = useAnimatedStyle(() => {
    const p = interpolate(drawn.value, [center * 0.8, center * 0.8 + 0.25], [0, 1], 'clamp');
    return { opacity: p, transform: [{ translateY: (1 - p) * 6 }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, base]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
        {hairs.map((h, i) => (
          <Path key={i} d={h.d} stroke={h.light ? '#E3C2B4' : '#C9A96E'} strokeWidth={h.w} strokeLinecap="round" fill="none" opacity={0.85} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Brow-mapping lines (head, arch, tail) with measuring ticks, drawn in thin gold. */
function Guides({ drawn }: { drawn: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: interpolate(drawn.value, [0, 0.4], [0, 1], 'clamp') }));
  const head = edges(0);
  const arch = edges(0.66);
  const tail = edges(1);
  const nose = { x: 70, y: 214 };
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
        <Line x1={head.x} y1={8} x2={head.x} y2={212} stroke="#C9A96E" strokeWidth={0.6} strokeDasharray="2 5" opacity={0.55} />
        <Line x1={nose.x} y1={nose.y} x2={arch.x + 22} y2={arch.upper - 30} stroke="#C9A96E" strokeWidth={0.6} strokeDasharray="2 5" opacity={0.5} />
        <Line x1={nose.x} y1={nose.y} x2={tail.x + 26} y2={tail.upper - 8} stroke="#C9A96E" strokeWidth={0.6} strokeDasharray="2 5" opacity={0.5} />
        <Line x1={20} y1={head.lower + 6} x2={384} y2={head.lower + 6} stroke="#E3C2B4" strokeWidth={0.5} opacity={0.3} />
        {Array.from({ length: 19 }, (_, i) => (
          <Line key={i} x1={20 + i * 20} y1={head.lower + 6} x2={20 + i * 20} y2={head.lower + (i % 5 === 0 ? 14 : 10)} stroke="#E3C2B4" strokeWidth={0.5} opacity={0.35} />
        ))}
        {[head, arch, tail].map((p, i) => (
          <Path key={i} d={`M${p.x - 4} ${p.upper - 6}h8M${p.x} ${p.upper - 10}v8`} stroke="#FFF7EF" strokeWidth={0.7} opacity={0.6} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#0B0807' },
  light: { position: 'absolute', width: '160%', aspectRatio: 1, left: '-30%', top: '-45%' },
  // The brow sits in the upper part, wide, behind the title.
  browBox: { position: 'absolute', left: '-12%', right: '-12%', top: '3%', aspectRatio: VB.w / VB.h },
});
