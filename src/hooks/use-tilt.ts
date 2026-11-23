import { Accelerometer } from 'expo-sensors';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

/**
 * Device tilt as two smoothed values in -1..1 (x: left/right, y: forward/back),
 * from the accelerometer (no permission needed). Stays at 0 on the web and when
 * the system "Reduce Motion" setting is on.
 */
export function useTilt(): { x: SharedValue<number>; y: SharedValue<number> } {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (Platform.OS === 'web' || reduce) return;
    Accelerometer.setUpdateInterval(60);
    const sub = Accelerometer.addListener(({ x: ax, y: ay }) => {
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      // Phone held upright reads y ≈ -1; measure tilt relative to a natural ~35° hold.
      x.set(withSpring(clamp(ax * 1.6), { damping: 20, stiffness: 90 }));
      y.set(withSpring(clamp((ay + 0.6) * 1.6), { damping: 20, stiffness: 90 }));
    });
    return () => sub.remove();
  }, [reduce, x, y]);

  return { x, y };
}
