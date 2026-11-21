import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, FadeInLeft } from 'react-native-reanimated';

import { AuthHero } from '@/components/auth-hero';
import { OtpInput, OTP_LENGTH } from '@/components/otp-input';
import { Button, ErrorBox, Field, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { formatPhone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { isMobile, toE164 } from '@/lib/identity';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';

const RESEND_SECONDS = 45;

/**
 * The first screen for anyone not signed in. Sign-in and sign-up are the same:
 * enter a mobile number, get a one-time code by SMS, type it in. New numbers
 * get an account automatically (the name is asked right after).
 */
export default function Login() {
  const { session } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (session) return <Redirect href="/" />;

  async function sendCode() {
    setError(null);
    if (!isMobile(phone)) return setError('הזינו מספר נייד ישראלי, למשל 050-1234567.');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: toE164(phone), options: { channel: 'sms' } });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    setCode('');
    setStep('code');
    setResendIn(RESEND_SECONDS);
  }

  async function verify(token = code) {
    setError(null);
    if (token.length !== OTP_LENGTH) return setError('הקוד מכיל 6 ספרות.');
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ phone: toE164(phone), token, type: 'sms' });
    setBusy(false);
    if (err) {
      setError(errorMessage(err));
      setShake((n) => n + 1);
      setCode('');
      return;
    }
    haptics.success();
    router.replace('/');
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        step === 'phone' ? (
          <Button title="שליחת קוד" icon="chatbubble-ellipses-outline" onPress={sendCode} loading={busy} />
        ) : (
          <Button title="כניסה" onPress={() => verify()} loading={busy} disabled={code.length !== OTP_LENGTH} />
        )
      }>
      <AuthHero subtitle="נכנסים עם מספר הטלפון, בלי סיסמה" />

      {step === 'phone' ? (
        <Animated.View key="phone" entering={FadeInLeft.duration(380).easing(Easing.out(Easing.cubic))} style={{ gap: spacing.lg }}>
          <Field
            label="מספר נייד"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="050-1234567"
            onSubmitEditing={sendCode}
            hint="נשלח אליך קוד חד־פעמי ב־SMS"
          />
          <ErrorBox message={error} />
        </Animated.View>
      ) : (
        <Animated.View key="code" entering={FadeInLeft.duration(380).easing(Easing.out(Easing.cubic))} style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Txt center>הזינו את הקוד שנשלח ל־</Txt>
            <Txt variant="h3" center>
              {`⁦${formatPhone(phone)}⁩`}
            </Txt>
          </View>
          <OtpInput value={code} onChange={setCode} onComplete={(v) => verify(v)} shake={shake} />
          <ErrorBox message={error} />
          <View style={{ gap: spacing.md, alignItems: 'center' }}>
            {resendIn > 0 ? (
              <Txt variant="small" faint>
                אפשר לבקש קוד חדש בעוד {resendIn} שניות
              </Txt>
            ) : (
              <Pressable onPress={sendCode} accessibilityRole="button" hitSlop={8}>
                <Txt variant="small" muted style={{ textDecorationLine: 'underline' }}>
                  לא קיבלתי — שליחה מחדש
                </Txt>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                setStep('phone');
                setError(null);
              }}
              accessibilityRole="button"
              hitSlop={8}>
              <Txt variant="small" muted>
                שינוי מספר
              </Txt>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
        <Txt variant="tiny" faint center>
          בכניסה את/ה מאשר/ת את{' '}
          <Txt variant="tiny" muted style={{ textDecorationLine: 'underline' }}>
            מדיניות הפרטיות
          </Txt>
        </Txt>
      </Pressable>
    </Screen>
  );
}
