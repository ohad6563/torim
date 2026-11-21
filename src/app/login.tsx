import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorBox, Field, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { showMessage } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('נא למלא אימייל וסיסמה.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else router.replace('/');
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError('הזינו את האימייל שלכם ואז לחצו על "שכחתי סיסמה".');
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (err) setError(errorMessage(err));
    else showMessage('נשלח אימייל', 'שלחנו לכם קישור לאיפוס הסיסמה.');
  }

  return (
    <Screen>
      <Txt variant="h2">שמחים לראות אותך שוב</Txt>
      <Field
        label="אימייל"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
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
      <Button title="התחברות" onPress={submit} loading={busy} />
      <Button title="שכחתי סיסמה" variant="ghost" onPress={resetPassword} />
      <Button title="אין לי חשבון עדיין — להרשמה" variant="ghost" onPress={() => router.replace('/signup')} />
    </Screen>
  );
}
