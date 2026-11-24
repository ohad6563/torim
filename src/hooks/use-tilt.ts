import { Accelerometer } from 'expo-sensors';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

const SPRING = { damping: 16, stiffness: 120, mass: 0.6 };
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Device tilt as two smoothed values in -1..1 (x: left/right, y: forward/back).
 * On phones it comes from the accelerometer (no permission needed); on the web it
 * follows the mouse. Stays at 0 when the system "Reduce Motion" setting is on.
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
    const sub = Accelerometer.addListener(({ x: ax, y: ay }) => {
      // Full effect at ~25° of tilt; upright phone reads y ≈ -1, so measure from a natural ~35° hold.
      x.set(withSpring(clamp(ax * 2.4), SPRING));
      y.set(withSpring(clamp((ay + 0.6) * 2.4), SPRING));
    });
    return () => sub.remove();
  }, [reduce, x, y]);

  return { x, y };
}
