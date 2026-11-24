import { Accelerometer } from 'expo-sensors';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

const SPRING = { damping: 22, stiffness: 90, mass: 0.8 };
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Device tilt as two smoothed values in -1..1 (x: left/right, y: forward/back).
 * On phones it comes from the accelerometer (no permission needed), relative to the
 * current hold; on the web it follows the mouse. Stays at 0 when the system "Reduce Motion" setting is on.
 */
export function useTilt(): { x: SharedValue<number>; y: SharedValue<number> } {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const onMove = (e: PointerEvent) => {
        x.set(withSpring(clamp((e.clientX / window.innerWidth) * 2 - 1), SPRING));
        y.set(withSpring(clamp((e.clientY / window.innerHeight) * 2 - 1), SPRING));
      };
      window.addEventListener('pointermove', onMove);
      return () => window.removeEventListener('pointermove', onMove);
    }
    Accelerometer.setUpdateInterval(33);
    // Measure tilt relative to how the phone is being held: a slow-moving baseline
    // follows the hold (~1.5 s), so any grip is "center" and only movement counts.
    let base: { x: number; y: number } | null = null;
    const sub = Accelerometer.addListener(({ x: ax, y: ay }) => {
      if (!base) base = { x: ax, y: ay };
      base.x += (ax - base.x) * 0.02;
      base.y += (ay - base.y) * 0.02;
      // Soft limit: strong near the center, eases off toward ±1 instead of hitting a wall.
      x.set(withSpring(Math.tanh((ax - base.x) * 2.2), SPRING));
      y.set(withSpring(Math.tanh((ay - base.y) * 2.2), SPRING));
    });
    return () => sub.remove();
  }, [reduce, x, y]);

  return { x, y };
}
