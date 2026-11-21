import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, ErrorBox, Field, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function Signup() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  if (session) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('כתובת האימייל לא תקינה.');
      return;
    }
    if (password.length < 8) {
      setError('הסיסמה צריכה להכיל לפחות 8 תווים.');
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else if (!data.session) setNeedsConfirm(true); // email confirmation is turned on in Supabase
    else router.replace('/onboarding');
  }

  if (needsConfirm) {
    return (
      <Screen>
        <Card>
          <Txt variant="h3">כמעט סיימנו ✉️</Txt>
          <Txt muted>
            שלחנו אימייל לאישור לכתובת {email.trim()}. לחצו על הקישור שבאימייל ואז חזרו לכאן כדי להתחבר.
          </Txt>
        </Card>
        <Button title="למסך ההתחברות" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Txt variant="h2">פתיחת חשבון לעסק</Txt>
      <Txt muted>החשבון מיועד לבעלי העסק. הלקוחות שלכם קובעים תור בלי להירשם.</Txt>
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
        autoComplete="new-password"
        textContentType="newPassword"
        hint="לפחות 8 תווים"
        onSubmitEditing={submit}
      />
      <ErrorBox message={error} />
      <Button title="יצירת חשבון" onPress={submit} loading={busy} />
      <Button title="כבר יש לי חשבון — להתחברות" variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
