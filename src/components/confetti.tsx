import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/** Brand palette for the celebration: ink, champagne gold, nude, warm white, taupe. */
const PALETTE = ['#C9A96E', '#E3C2B4', '#FFF7EF', '#8E7C72', '#B8895A'];

const DURATION = 2200; // ms, the whole fall
const GRAVITY = 1500; // px/s²

type Piece = {
  x0: number;
  y0: number;
  vx: number; // px/s
  vy: number; // px/s (negative = up)
  spin: number; // deg over the whole fall
  flip: number; // flutter speed
  w: number;
  h: number;
  radius: number;
  color: string;
  delay: number; // ms
};

/** Deterministic burst: two cannons from the bottom corners, then a shower from the top. */
function makePieces(width: number, height: number): Piece[] {
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const shape = () => {
    const k = r();
    if (k < 0.5) return { w: 8 + r() * 6, h: 4 + r() * 3, radius: 1.5 }; // paper strip
    if (k < 0.8) return { w: 7 + r() * 5, h: 7 + r() * 5, radius: 2 }; // square
    const d = 6 + r() * 5;
    return { w: d, h: d, radius: d }; // dot
  };
  const pieces: Piece[] = [];
  // Cannons: bottom-left shoots up-right, bottom-right shoots up-left.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const tilt = (14 + r() * 34) * (Math.PI / 180); // angle away from straight up, towards the centre
      const speed = height * (1.05 + r() * 0.75);
      pieces.push({
        x0: side < 0 ? -10 : width + 10,
        y0: height * 0.92,
        vx: Math.sin(tilt) * speed * -side, // left cannon (side -1) moves right, and vice versa
        vy: -Math.cos(tilt) * speed,
        spin: (r() - 0.5) * 1440,
        flip: 6 + r() * 10,
        color: PALETTE[Math.floor(r() * PALETTE.length)],
        delay: r() * 140,
        ...shape(),
      });
    }
  }
  // A gentle shower from the top a moment later.
  for (let i = 0; i < 16; i++) {
    pieces.push({
      x0: r() * width,
      y0: -20 - r() * 80,
      vx: (r() - 0.5) * 120,
      vy: 60 + r() * 120,
      spin: (r() - 0.5) * 900,
      flip: 4 + r() * 8,
      color: PALETTE[Math.floor(r() * PALETTE.length)],
      delay: 380 + r() * 500,
      ...shape(),
    });
  }
  return pieces;
}

/**
 * Celebration confetti, drawn on top of the whole screen. Pure Reanimated
 * (UI thread). Laid out left-to-right on purpose: in the RTL app, "left: 0"
 * would otherwise mean the right edge and send the pieces off-screen.
 * Skipped when the system "Reduce Motion" setting is on.
 */
/** `delay`: ms to wait first, so the confirmation message lands before the celebration. */
export function Confetti({ delay = 0 }: { delay?: number }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const pieces = useMemo(() => makePieces(width, height), [width, height]);
  if (reduce) return null;
  return (
    <View style={styles.layer} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} delay={delay} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, delay }: { piece: Piece; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay + piece.delay, withTiming(1, { duration: DURATION, easing: Easing.linear })));
  }, [t, piece.delay, delay]);

  const style = useAnimatedStyle(() => {
    const s = (t.value * DURATION) / 1000; // seconds
    const drag = 1 - Math.min(0.6, s * 0.22); // air slows the sideways drift
    const x = piece.x0 + piece.vx * s * drag + Math.sin(s * piece.flip) * 10; // flutter sideways
    const y = piece.y0 + piece.vy * s + 0.5 * GRAVITY * s * s * 0.55;
    return {
      opacity: t.value === 0 ? 0 : t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.spin * t.value}deg` },
        { scaleY: Math.cos(s * piece.flip) }, // tumbling paper (2D: 3D rotations can break rendering)
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.w, height: piece.h, borderRadius: piece.radius, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // Clipped to the screen: pieces flying past the edge must not widen the page.
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, direction: 'ltr', zIndex: 50, elevation: 50, overflow: 'hidden' },
  piece: { position: 'absolute', left: 0, top: 0 },
});
