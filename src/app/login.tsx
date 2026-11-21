import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuthHero } from '@/components/auth-hero';
import { SocialButtons } from '@/components/social-buttons';
import { ErrorBox, Row, Screen, Txt, type IconName } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { safeNext } from '@/lib/nav';
import { signInWithApple, signInWithGoogle } from '@/lib/social-auth';
import { colors, radius, spacing } from '@/theme';

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'time-outline', text: 'קביעת תור בכמה שניות, 24/7' },
  { icon: 'calendar-outline', text: 'כל התורים שלך במקום אחד' },
  { icon: 'lock-closed-outline', text: 'בלי סיסמאות – כניסה בלחיצה' },
];

/**
 * First screen for anyone not signed in: one tap with Google (or Apple on iPhone).
 * Sign-in and sign-up are the same; new customers add their name and phone right after.
 */
export default function Login() {
  const { session } = useAuth();
  // Where to go after signing in (e.g. a booking link opened while signed out).
  const next = safeNext(useLocalSearchParams<{ next?: string }>().next);
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href={(next ?? '/') as Href} />;

  async function run(kind: 'google' | 'apple') {
    if (busy) return;
    setError(null);
    setBusy(kind);
    const res = kind === 'google' ? await signInWithGoogle(next) : await signInWithApple();
    // On the web, Google sign-in navigates away to Google; keep the spinner until the page leaves.
    if (res.ok && kind === 'google' && Platform.OS === 'web') return;
    setBusy(null);
    if (res.ok) {
      haptics.success();
      router.replace((next ?? '/') as Href);
    } else if (!res.cancelled) {
      setError(errorMessage(res.error));
    }
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <SocialButtons busy={busy} onGoogle={() => run('google')} onApple={() => run('apple')} />
          <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" style={{ paddingTop: spacing.xs }}>
            <Txt variant="tiny" faint center>
              בכניסה את/ה מאשר/ת את{' '}
              <Txt variant="tiny" muted style={{ textDecorationLine: 'underline' }}>
                מדיניות הפרטיות
              </Txt>
            </Txt>
          </Pressable>
        </>
      }>
      <AuthHero subtitle="ברוכים הבאים לסטודיו" />

      <View style={styles.perks}>
        {PERKS.map((p, i) => (
          <Animated.View key={p.text} entering={FadeInDown.delay(900 + i * 120).duration(600)}>
            <Row gap={spacing.md}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon} size={18} color={colors.text} />
              </View>
              <Txt style={{ flex: 1 }}>{p.text}</Txt>
            </Row>
          </Animated.View>
        ))}
      </View>

      <ErrorBox message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  perks: { gap: spacing.md, paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  perkIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
