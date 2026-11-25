
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ErrorBox, Field, Row, Screen, Txt } from '@/components/ui';
import { useAuth, useBusiness } from '@/context/auth';
import { CATEGORIES } from '@/lib/business-defaults';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { bookingUrl } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';
import { goBackOr } from '@/lib/nav';

function Profile() {
  const business = useBusiness();
  const { refreshBusiness } = useAuth();
  const [name, setName] = useState(business.name);
  const [category, setCategory] = useState(business.category ?? 'אחר');
  const [phone, setPhone] = useState(formatPhone(business.phone));
  const [address, setAddress] = useState(business.address ?? '');
  const [description, setDescription] = useState(business.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין את שם העסק.');
    if (phone && !isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');
    setBusy(true);
    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        category,
        phone: phone ? normalizePhone(phone) : null,
        address: address.trim() || null,
        description: description.trim() || null,
      })
      .eq('id', business.id);
    if (err) {
      setBusy(false);
      return setError(errorMessage(err));
    }
    await refreshBusiness();
    setBusy(false);
    goBackOr('/settings');
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
      {/* The link address is fixed: the app is built for it, so changing it would break the customer app. */}
      <Field label="כתובת לקישור ההזמנות" value={bookingUrl(business.slug)} editable={false} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
      <ErrorBox message={error} />
    </Screen>
  );
}

export default withOwner(Profile);
