import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ErrorBox, Field, Loading, Row, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import {
  CATEGORIES,
  cleanSlug,
  DEFAULT_HOURS,
  DEFAULT_SERVICES,
  isValidSlug,
  type Category,
} from '@/lib/business-defaults';
import { isValidPhone, normalizePhone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { bookingUrl } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';

export default function Onboarding() {
  const { loading, session, business, refreshBusiness } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('מספרה');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (business) return <Redirect href="/calendar" />;

  async function submit() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין את שם העסק.');
    if (phone && !isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');
    if (!isValidSlug(slug)) return setError('הכתובת צריכה להכיל 3–40 אותיות באנגלית, ספרות או מקפים.');

    setBusy(true);
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .insert({
        owner_id: session!.user.id,
        name: name.trim(),
        category,
        phone: phone ? normalizePhone(phone) : null,
        address: address.trim() || null,
        slug,
      })
      .select()
      .single();

    if (bizErr || !biz) {
      setBusy(false);
      return setError(errorMessage(bizErr));
    }

    // Starter data so the booking page works right away; everything is editable later.
    await Promise.all([
      supabase.from('working_hours').insert(DEFAULT_HOURS.map((h) => ({ ...h, business_id: biz.id }))),
      supabase
        .from('services')
        .insert(DEFAULT_SERVICES[category].map((s, i) => ({ ...s, business_id: biz.id, sort_order: i }))),
    ]);

    await refreshBusiness();
    setBusy(false);
    router.replace('/calendar');
  }

  return (
    <Screen
      footer={<Button title="יצירת העסק" onPress={submit} loading={busy} />}>
      <View style={{ gap: spacing.xs }}>
        <Txt variant="h2">ספרו לנו על העסק</Txt>
        <Txt muted>אפשר לשנות הכל אחר כך בהגדרות.</Txt>
      </View>

      <Field label="שם העסק" value={name} onChangeText={setName} placeholder="למשל: סטודיו נועה" />

      <View style={{ gap: spacing.sm }}>
        <Txt variant="small" bold>
          תחום
        </Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={c === category} onPress={() => setCategory(c)} />
          ))}
        </Row>
        <Txt variant="tiny" muted>
          נוסיף לכם כמה שירותים לדוגמה לפי התחום.
        </Txt>
      </View>

      <Field
        label="טלפון של העסק"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="050-0000000"
      />
      <Field label="כתובת" value={address} onChangeText={setAddress} placeholder="רחוב, מספר, עיר" />
      <Field
        label="כתובת לקישור ההזמנות (באנגלית)"
        value={slug}
        onChangeText={(t) => setSlug(cleanSlug(t))}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="studio-noa"
        hint={slug ? bookingUrl(slug) : 'זה הקישור שתשלחו ללקוחות כדי שיקבעו תור'}
        style={{ writingDirection: 'ltr', textAlign: 'left' }}
      />
      <ErrorBox message={error} />
    </Screen>
  );
}
