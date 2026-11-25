import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

import { AuthHero } from '@/components/auth-hero';
import { SocialButtons } from '@/components/social-buttons';
import { BrowScene } from '@/components/brow-scene';
import { ErrorBox, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { safeNext } from '@/lib/nav';
import { signInWithApple, signInWithGoogle } from '@/lib/social-auth';
import { MAX_WIDTH, motion, spacing } from '@/theme';

/**
 * First screen for anyone not signed in: one tap with Google (or Apple on iPhone).
 * Sign-in and sign-up are the same; new customers add their name and phone right after.
 */
const LINKS: { label: string; href: Href }[] = [
  { label: 'תנאי השימוש', href: '/terms' },
  { label: 'מדיניות הפרטיות', href: '/privacy' },
  { label: 'נגישות', href: '/accessibility' },
];

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
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Live brow scene behind everything, darkened so the text stays readable. */}
      <BrowScene />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <AuthHero subtitle="ברוכים הבאים לסטודיו" onDark />
            {/* One quiet line instead of a list of icon "perks" (a template look). */}
            <Animated.View entering={FadeIn.delay(280).duration(motion.slow)}>
              <Txt variant="small" center color="rgba(255,255,255,0.62)" style={styles.tagline}>
                קביעת תור בכמה שניות · תזכורת לפני כל תור
              </Txt>
            </Animated.View>
            <ErrorBox message={error} />
          </View>
        </ScrollView>
        <Animated.View entering={FadeInDown.delay(360).duration(motion.slow).easing(Easing.bezier(...motion.curve))} style={styles.footer}>
          <SocialButtons busy={busy} onGoogle={() => run('google')} onApple={() => run('apple')} onDark />
          <View style={styles.links}>
            {LINKS.map((l) => (
              <Pressable key={l.label} onPress={() => router.push(l.href)} accessibilityRole="link" style={styles.linkHit}>
                <Txt variant="tiny" color="rgba(255,255,255,0.85)" style={styles.link}>
                  {l.label}
                </Txt>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { textDecorationLine: 'underline' },
  links: { flexDirection: 'row', justifyContent: 'center', columnGap: spacing.md },
  linkHit: { minHeight: 44, justifyContent: 'center' },
  root: { flex: 1, backgroundColor: '#0b0807' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, justifyContent: 'center' },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: spacing.lg },
  tagline: { letterSpacing: 0.3 },
  footer: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
