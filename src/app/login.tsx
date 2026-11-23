import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuthHero } from '@/components/auth-hero';
import { SocialButtons } from '@/components/social-buttons';
import { VideoBackdrop } from '@/components/video-backdrop';
import { ErrorBox, Row, Txt, type IconName } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { safeNext } from '@/lib/nav';
import { signInWithApple, signInWithGoogle } from '@/lib/social-auth';
import { MAX_WIDTH, radius, spacing } from '@/theme';

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
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Looping studio video behind everything, darkened so the text stays readable. */}
      <VideoBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <AuthHero subtitle="ברוכים הבאים לסטודיו" onDark />
            <View style={styles.perks}>
              {PERKS.map((p, i) => (
                <Animated.View key={p.text} entering={FadeInDown.delay(900 + i * 120).duration(600)}>
                  <Row gap={spacing.md}>
                    <View style={styles.perkIcon}>
                      <Ionicons name={p.icon} size={18} color="#FFFFFF" />
                    </View>
                    <Txt color="#FFFFFF" style={{ flex: 1 }}>
                      {p.text}
                    </Txt>
                  </Row>
                </Animated.View>
              ))}
            </View>
            <ErrorBox message={error} />
          </View>
        </ScrollView>
        <Animated.View entering={FadeInDown.delay(1300).duration(700)} style={styles.footer}>
          <SocialButtons busy={busy} onGoogle={() => run('google')} onApple={() => run('apple')} onDark />
          <Txt variant="tiny" center color="rgba(255,255,255,0.6)" style={{ paddingTop: spacing.xs }}>
            <Txt variant="tiny" color="rgba(255,255,255,0.85)" style={styles.link} onPress={() => router.push('/terms')}>
              תנאי השימוש
            </Txt>
            {'  ·  '}
            <Txt variant="tiny" color="rgba(255,255,255,0.85)" style={styles.link} onPress={() => router.push('/privacy')}>
              מדיניות הפרטיות
            </Txt>
            {'  ·  '}
            <Txt variant="tiny" color="rgba(255,255,255,0.85)" style={styles.link} onPress={() => router.push('/accessibility')}>
              נגישות
            </Txt>
          </Txt>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { textDecorationLine: 'underline' },
  root: { flex: 1, backgroundColor: '#0b0807' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, justifyContent: 'center' },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: spacing.lg },
  perks: { gap: spacing.md, paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  perkIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
