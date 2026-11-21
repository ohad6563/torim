import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { haptics } from '@/lib/haptics';
import { isAppleSignInAvailable } from '@/lib/social-auth';
import { colors, family, font, radius, spacing, springs } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Google's "G" mark (brand guidelines: full colour on a white button). */
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

function GoogleButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      onPressIn={() => scale.set(withSpring(0.97, springs.press))}
      onPressOut={() => scale.set(withSpring(1, springs.press))}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="המשך עם Google"
      style={[styles.google, style]}>
      {loading ? (
        <ActivityIndicator color="#1F1F1F" />
      ) : (
        <View style={styles.inner}>
          <GoogleG />
          <Text style={styles.googleText}>המשך עם Google</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

/**
 * Sign-in buttons. Google everywhere; Apple on iPhone (native button, as Apple
 * requires whenever another social sign-in is offered — guideline 4.8).
 */
export function SocialButtons({
  onGoogle,
  onApple,
  busy,
}: {
  onGoogle: () => void;
  onApple: () => void;
  busy: 'google' | 'apple' | null;
}) {
  const [apple, setApple] = useState(false);
  useEffect(() => {
    isAppleSignInAvailable().then(setApple);
  }, []);

  return (
    <View style={styles.wrap}>
      {apple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            colors.isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radius.pill}
          style={styles.apple}
          onPress={() => {
            if (busy) return;
            haptics.tap();
            onApple();
          }}
        />
      ) : null}
      <GoogleButton onPress={onGoogle} loading={busy === 'google'} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  apple: { height: 54, width: '100%' },
  google: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  googleText: { fontFamily: family.semibold, fontSize: font.body, color: '#1F1F1F' },
});
