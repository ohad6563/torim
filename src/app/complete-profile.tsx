import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { AuthHero } from '@/components/auth-hero';
import { withAccount } from '@/components/owner-gate';
import { Appear, Button, ErrorBox, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';

/** Shown once, right after a new phone number signs in: asks for the customer's name. */
function CompleteProfile() {
  const { session, profile, isAdmin, refresh } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already done (or an admin): nothing to complete here.
  if (isAdmin || profile?.full_name) return <Redirect href="/" />;

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם מלא.');
    setBusy(true);
    // upsert: works even if the profile row wasn't created at sign-up.
    const { error: err } = await supabase.from('profiles').upsert({ id: session!.user.id, full_name: name.trim() });
    if (err) {
      setBusy(false);
      return setError(errorMessage(err));
    }
    await refresh();
    setBusy(false);
    router.replace('/');
  }

  return (
    <Screen edges={['top', 'bottom']} footer={<Button title="המשך" onPress={save} loading={busy} />}>
      <AuthHero subtitle="נעים להכיר! איך קוראים לך?" compact />
      <Appear delay={400} style={{ gap: spacing.lg }}>
        <Field
          label="שם מלא"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          autoFocus
          onSubmitEditing={save}
          hint="כך הסטודיו יזהה אותך בתורים"
        />
        <ErrorBox message={error} />
      </Appear>
    </Screen>
  );
}

export default withAccount(CompleteProfile);
