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

import { colors } from '@/theme';

const PALETTE = [colors.primary, '#C9A96E', '#E3C2B4', '#FFFFFF', '#8E7C72'];

type Piece = { x: number; vx: number; vy: number; rot: number; size: number; color: string; delay: number; round: boolean };

/** Deterministic pseudo-random pieces (same burst every time). */
function makePieces(count: number, width: number, height: number): Piece[] {
  let seed = 42;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({
    x: width / 2 + (r() - 0.5) * 60,
    vx: (r() - 0.5) * width * 1.8,
    vy: -(height * 0.35 + r() * height * 0.35),
    rot: (r() - 0.5) * 900,
    size: 6 + r() * 7,
    color: PALETTE[Math.floor(r() * PALETTE.length)],
    delay: r() * 180,
    round: r() < 0.3,
  }));
}

/**
 * A short burst of confetti from the top-centre, for celebrating a booking.
 * Pure Reanimated (no extra library); skipped with "Reduce Motion".
 */
export function Confetti({ count = 70 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const pieces = useMemo(() => makePieces(count, width, height), [count, width, height]);

  if (reduce) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, height }: { piece: Piece; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(piece.delay, withTiming(1, { duration: 2400, easing: Easing.linear })));
  }, [t, piece.delay]);
  const style = useAnimatedStyle(() => {
    const k = t.value;
    // Launch up and out, then fall with gravity; fade in the last part.
    const x = piece.x + piece.vx * k * (1 - k * 0.35);
    const y = height * 0.18 + piece.vy * k + height * 1.15 * k * k;
    return {
      opacity: k < 0.8 ? 1 : (1 - k) / 0.2,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${piece.rot * k}deg` }, { scaleY: 0.6 + 0.4 * Math.cos(k * 18) }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.size, height: piece.round ? piece.size : piece.size * 0.45, backgroundColor: piece.color, borderRadius: piece.round ? piece.size : 1.5 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
});
