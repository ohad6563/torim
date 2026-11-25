import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthHero } from '@/components/auth-hero';
import { withAccount } from '@/components/owner-gate';
import { Appear, Button, ErrorBox, Field, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { normalizePhone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { isMobile } from '@/lib/identity';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';

/**
 * Shown once after the first sign-in: confirms the name (pre-filled from Google /
 * Apple) and asks for a mobile number, so the studio can reach the customer.
 */
function CompleteProfile() {
  const { session, profile, isAdmin, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  // Returning customers who already accepted don't need to tick it again.
  const [agreed, setAgreed] = useState(!!profile?.terms_accepted_at);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAdmin || (profile?.full_name && profile?.phone && profile?.terms_accepted_at)) return <Redirect href="/" />;

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם מלא.');
    if (!isMobile(phone)) return setError('הזינו מספר נייד ישראלי, למשל 050-1234567.');
    if (!agreed) return setError('כדי להמשיך יש לאשר את תנאי השימוש ומדיניות הפרטיות.');
    setBusy(true);
    // upsert: works even if the profile row wasn't created at sign-up.
    const { error: err } = await supabase
      .from('profiles')
      .upsert({
        id: session!.user.id,
        full_name: name.trim(),
        phone: normalizePhone(phone),
        terms_accepted_at: profile?.terms_accepted_at ?? new Date().toISOString(),
      });
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
      <Appear style={{ gap: spacing.lg }}>
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
        <Pressable
          onPress={() => setAgreed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="קראתי ואני מסכימה לתנאי השימוש ולמדיניות הפרטיות"
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.sm,
              borderWidth: 1.5,
              borderColor: agreed ? colors.primary : colors.borderStrong,
              backgroundColor: agreed ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}>
            {agreed ? <Ionicons name="checkmark" size={15} color={colors.textOnPrimary} /> : null}
          </View>
          <Txt variant="small" style={{ flex: 1 }}>
            קראתי ואני מסכימה ל
            <Txt variant="small" style={{ textDecorationLine: 'underline' }} onPress={() => router.push('/terms')}>
              תנאי השימוש
            </Txt>
            {' '}ול
            <Txt variant="small" style={{ textDecorationLine: 'underline' }} onPress={() => router.push('/privacy')}>
              מדיניות הפרטיות
            </Txt>
          </Txt>
        </Pressable>
        <ErrorBox message={error} />
      </Appear>
    </Screen>
  );
}

export default withAccount(CompleteProfile);
