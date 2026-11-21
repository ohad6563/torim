import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { colors, family, radius, spacing } from '@/theme';

export const OTP_LENGTH = 6;

/**
 * Six boxes for a one-time code. A single hidden input does the typing, so
 * paste and the iOS / Android "code from SMS" suggestion fill all boxes at once.
 * `shake` (any changing number) plays a short shake, e.g. after a wrong code.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  shake = 0,
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  shake?: number;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInputInstance>(null);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!shake) return;
    x.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [shake, x]);
  // Focus once the screen's entrance animation has started (autoFocus alone is unreliable on web).
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false}>
      <Animated.View style={[styles.row, shakeStyle]}>
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const char = value[i] ?? '';
          const active = i === Math.min(value.length, OTP_LENGTH - 1);
          return (
            <View key={i} style={[styles.box, char ? styles.boxFilled : null, active && styles.boxActive]}>
              <Text style={styles.char}>{char}</Text>
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
          onChange(digits);
          if (digits.length === OTP_LENGTH) onComplete?.(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={OTP_LENGTH}
        accessibilityLabel="קוד אימות בן 6 ספרות"
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Codes read left-to-right even in a Hebrew app.
  row: { flexDirection: 'row', direction: 'ltr', justifyContent: 'center', gap: spacing.sm },
  box: {
    width: 48,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.borderStrong },
  boxActive: { borderColor: colors.text, borderWidth: 1.5 },
  char: { fontFamily: family.semibold, fontSize: 24, color: colors.text },
  hidden: { position: 'absolute', opacity: 0.01, width: '100%', height: '100%', top: 0, left: 0, color: 'transparent' },
});
