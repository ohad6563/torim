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
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTilt } from '@/hooks/use-tilt';

/**
 * Live, interactive hero background: a brow drawn hair by hair (like microblading),
 * over the brow-mapping guide lines artists draw, in depth layers that move strongly
 * with the phone's tilt (or the mouse on the web). A gold "foil" shine runs across the
 * hairs as the phone turns, and the studio light swings the other way.
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

  const tx = useDerivedValue(() => tilt.x.value + (idle.value - 0.5) * 0.35);
  const ty = useDerivedValue(() => tilt.y.value + (idle.value - 0.5) * 0.15);
  const parallax = useDerivedValue(() => (scrollY ? interpolate(scrollY.value, [-200, 0, 600], [-60, 0, 260]) : 0));

  // One 3D stage, tilted with the phone; layers inside move by depth.
  const stage = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: parallax.value },
      { rotateY: `${tx.value * 22}deg` },
      { rotateX: `${-ty.value * 14}deg` },
    ],
  }));
  const layer = (depth: number) => () => {
    'worklet';
    return { transform: [{ translateX: tx.value * depth }, { translateY: ty.value * depth * 0.7 }] };
  };
  const lightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value * -140 }, { translateY: ty.value * -90 + parallax.value * 0.4 }],
  }));
  const guidesStyle = useAnimatedStyle(layer(-24));
  const browStyle = useAnimatedStyle(layer(36));
  const nearStyle = useAnimatedStyle(layer(95));

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
        <View style={styles.browBox}>
          <Animated.View style={[StyleSheet.absoluteFill, guidesStyle]}>
            <Guides drawn={drawn} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, browStyle]}>
            {BANDS.map((band, i) => (
              <Band key={i} index={i} hairs={band} drawn={drawn} tx={tx} />
            ))}
          </Animated.View>
        </View>
        <Animated.View style={[StyleSheet.absoluteFill, nearStyle]}>
          {FLOATERS.map((f, i) => (
            <Floater key={i} f={f} reduce={reduce} />
          ))}
        </Animated.View>
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

/** Small loose hairs floating in front, at different depths. */
const FLOATERS = (() => {
  const r = rng(31);
  return Array.from({ length: 13 }, () => ({
    left: `${4 + r() * 92}%` as const,
    top: `${6 + r() * 80}%` as const,
    size: 16 + r() * 22,
    rot: r() * 360,
    drift: 10 + r() * 18,
    dur: 4200 + r() * 4000,
    delay: r() * 2000,
    opacity: 0.25 + r() * 0.45,
  }));
})();

// ---------- layers ----------

/** One slice of the brow: base hairs that appear in turn, plus a gold shine that follows the tilt. */
function Band({ index, hairs, drawn, tx }: { index: number; hairs: Hair[]; drawn: SharedValue<number>; tx: SharedValue<number> }) {
  const center = (index + 0.5) / BAND_COUNT;
  const base = useAnimatedStyle(() => {
    const p = interpolate(drawn.value, [center * 0.8, center * 0.8 + 0.25], [0, 1], 'clamp');
    return { opacity: p, transform: [{ translateY: (1 - p) * 6 }] };
  });
  const shine = useAnimatedStyle(() => {
    const pos = (tx.value + 1) / 2; // 0..1 across the brow
    const near = 1 - Math.min(1, Math.abs(pos - center) * 4.5);
    return { opacity: drawn.value > center ? Math.max(0, near) * 0.75 : 0 };
  });
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, base]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
          {hairs.map((h, i) => (
            <Path key={i} d={h.d} stroke={h.light ? '#E3C2B4' : '#C9A96E'} strokeWidth={h.w} strokeLinecap="round" fill="none" opacity={0.85} />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, shine]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
          {hairs.map((h, i) => (
            <Path key={i} d={h.d} stroke="#FFF1DC" strokeWidth={h.w + 0.2} strokeLinecap="round" fill="none" />
          ))}
        </Svg>
      </Animated.View>
    </>
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

function Floater({ f, reduce }: { f: (typeof FLOATERS)[number]; reduce: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withDelay(f.delay, withRepeat(withSequence(withTiming(1, { duration: f.dur, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: f.dur, easing: Easing.inOut(Easing.sin) })), -1)));
  }, [reduce, t, f]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (t.value - 0.5) * f.drift }, { rotate: `${f.rot + t.value * 25}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: f.left, top: f.top, width: f.size, height: f.size, opacity: f.opacity }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 20 20">
        <Path d="M3 16Q9 9 17 4" stroke="#E3C2B4" strokeWidth={1.1} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#0B0807' },
  light: { position: 'absolute', width: '160%', aspectRatio: 1, left: '-30%', top: '-45%' },
  // The brow sits in the upper part, wide, behind the title.
  browBox: { position: 'absolute', left: '-8%', right: '-8%', top: '7%', aspectRatio: VB.w / VB.h },
});
