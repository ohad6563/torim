import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthHero } from '@/components/auth-hero';
import { Appear, Button, ErrorBox, Field, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { showMessage } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { isEmail, loginEmail } from '@/lib/identity';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';

/** First screen of the app for anyone who isn't signed in. */
export default function Login() {
  const { session } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    if (!identity.trim() || !password) return setError('נא למלא את כל הפרטים.');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail(identity), password });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else router.replace('/');
  }

  async function resetPassword() {
    if (!isEmail(identity)) {
      setError('לאיפוס סיסמה הזינו את כתובת האימייל של החשבון.');
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(identity.trim());
    if (err) setError(errorMessage(err));
    else showMessage('נשלח אימייל', 'שלחנו קישור לאיפוס הסיסמה.');
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button title="כניסה" onPress={submit} loading={busy} />
          <Button title="אין לי חשבון — הרשמה" variant="ghost" onPress={() => router.replace('/signup')} />
        </>
      }>
      <AuthHero subtitle="נכנסים, בוחרים טיפול וקובעים תור" />
      <Appear delay={700} style={{ gap: spacing.lg }}>
        <Field
          label="אימייל או שם משתמש"
          value={identity}
          onChangeText={setIdentity}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
        />
        <Field
          label="סיסמה"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
        />
        <ErrorBox message={error} />
        <Pressable onPress={resetPassword} accessibilityRole="button" hitSlop={8}>
          <Txt variant="small" muted center>
            שכחתי סיסמה
          </Txt>
        </Pressable>
      </Appear>
    </Screen>
  );
}
