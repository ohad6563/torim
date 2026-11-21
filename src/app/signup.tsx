import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthHero } from '@/components/auth-hero';
import { Appear, Button, Card, ErrorBox, Field, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { isValidPhone, normalizePhone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { isEmail, loginEmail, USERNAME_RE, usernameOf } from '@/lib/identity';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';

export default function Signup() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  if (session) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    const username = usernameOf(identity);
    if (name.trim().length < 2) return setError('נא להזין שם מלא.');
    if (!isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');
    if (username !== null ? !USERNAME_RE.test(username) : !isEmail(identity)) {
      return setError('הזינו אימייל, או שם משתמש באנגלית (3–30 תווים: אותיות, ספרות, נקודה, מקף).');
    }
    if (password.length < 8) return setError('הסיסמה צריכה להכיל לפחות 8 תווים.');

    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: loginEmail(identity),
      password,
      options: { data: { full_name: name.trim(), phone: normalizePhone(phone), username } },
    });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else if (!data.session) setNeedsConfirm(true); // email confirmation is turned on in Supabase
    else router.replace('/');
  }

  if (needsConfirm) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AuthHero subtitle="כמעט סיימנו" compact />
        <Card>
          <Txt variant="h3">בדקו את תיבת המייל ✉️</Txt>
          <Txt muted>שלחנו קישור לאישור החשבון. אחרי האישור חוזרים לכאן ונכנסים.</Txt>
        </Card>
        <Button title="למסך הכניסה" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button title="יצירת חשבון" onPress={submit} loading={busy} />
          <Button title="כבר יש לי חשבון — כניסה" variant="ghost" onPress={() => router.replace('/login')} />
        </>
      }>
      <AuthHero subtitle="חשבון אחד לכל התורים שלך" compact />
      <Appear delay={500} style={{ gap: spacing.lg }}>
        <Field label="שם מלא" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Field
          label="טלפון נייד"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="050-0000000"
        />
        <Field
          label="אימייל או שם משתמש"
          value={identity}
          onChangeText={setIdentity}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          hint="עם אימייל אפשר לשחזר סיסמה אם תשכחו אותה"
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
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
          <Txt variant="tiny" faint center>
            בהרשמה את/ה מאשר/ת את{' '}
            <Txt variant="tiny" muted style={{ textDecorationLine: 'underline' }}>
              מדיניות הפרטיות
            </Txt>
          </Txt>
        </Pressable>
      </Appear>
    </Screen>
  );
}
