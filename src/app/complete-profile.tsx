import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { AuthHero } from '@/components/auth-hero';
import { withAccount } from '@/components/owner-gate';
import { Appear, Button, ErrorBox, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { normalizePhone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { isMobile } from '@/lib/identity';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';

/**
 * Shown once after the first sign-in: confirms the name (pre-filled from Google /
 * Apple) and asks for a mobile number, so the studio can reach the customer.
 */
function CompleteProfile() {
  const { session, profile, isAdmin, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAdmin || (profile?.full_name && profile?.phone)) return <Redirect href="/" />;

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם מלא.');
    if (!isMobile(phone)) return setError('הזינו מספר נייד ישראלי, למשל 050-1234567.');
    setBusy(true);
    // upsert: works even if the profile row wasn't created at sign-up.
    const { error: err } = await supabase
      .from('profiles')
      .upsert({ id: session!.user.id, full_name: name.trim(), phone: normalizePhone(phone) });
    if (err) {
      setBusy(false);
      return setError(errorMessage(err));
    }
    await refresh();
    setBusy(false);
    router.replace('/');
  }

  return (
    <Screen edges={['top', 'bottom']} footer={<Button title="בואו נתחיל" onPress={save} loading={busy} />}>
      <AuthHero subtitle="עוד רגע מתחילים — רק כמה פרטים" compact />
      <Appear delay={400} style={{ gap: spacing.lg }}>
        <Field label="שם מלא" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Field
          label="טלפון נייד"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="050-1234567"
          hint="כדי שהסטודיו יוכל לעדכן אותך לגבי התור"
          onSubmitEditing={save}
        />
        <ErrorBox message={error} />
      </Appear>
    </Screen>
  );
}

export default withAccount(CompleteProfile);
