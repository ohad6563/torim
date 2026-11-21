import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ErrorBox, Field, Row, Screen, Txt } from '@/components/ui';
import { useAuth, useBusiness } from '@/context/auth';
import { CATEGORIES, cleanSlug, isValidSlug } from '@/lib/business-defaults';
import { isValidPhone, normalizePhone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { bookingUrl } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';

function Profile() {
  const business = useBusiness();
  const { refreshBusiness } = useAuth();
  const [name, setName] = useState(business.name);
  const [category, setCategory] = useState(business.category ?? 'אחר');
  const [phone, setPhone] = useState(business.phone ?? '');
  const [address, setAddress] = useState(business.address ?? '');
  const [description, setDescription] = useState(business.description ?? '');
  const [slug, setSlug] = useState(business.slug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין את שם העסק.');
    if (phone && !isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');
    if (!isValidSlug(slug)) return setError('הכתובת צריכה להכיל 3–40 אותיות באנגלית, ספרות או מקפים.');
    setBusy(true);
    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        category,
        phone: phone ? normalizePhone(phone) : null,
        address: address.trim() || null,
        description: description.trim() || null,
        slug,
      })
      .eq('id', business.id);
    if (err) {
      setBusy(false);
      return setError(errorMessage(err));
    }
    await refreshBusiness();
    setBusy(false);
    router.back();
  }

  return (
    <Screen footer={<Button title="שמירה" onPress={save} loading={busy} />}>
      <Field label="שם העסק" value={name} onChangeText={setName} />
      <View style={{ gap: spacing.sm }}>
        <Txt variant="small" bold>
          תחום
        </Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={c === category} onPress={() => setCategory(c)} />
          ))}
        </Row>
      </View>
      <Field label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="כתובת" value={address} onChangeText={setAddress} />
      <Field
        label="תיאור קצר"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={300}
        hint="יוצג ללקוחות בדף קביעת התורים"
      />
      <Field
        label="כתובת לקישור ההזמנות"
        value={slug}
        onChangeText={(t) => setSlug(cleanSlug(t))}
        autoCapitalize="none"
        autoCorrect={false}
        hint={
          slug !== business.slug
            ? `שימו לב: הקישור הישן יפסיק לעבוד. החדש: ${bookingUrl(slug)}`
            : bookingUrl(slug)
        }
        style={{ writingDirection: 'ltr', textAlign: 'left' }}
      />
      <ErrorBox message={error} />
    </Screen>
  );
}

export default withOwner(Profile);
