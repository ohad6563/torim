import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ErrorBox, Field, Loading, Row, Screen, Toggle, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { formatDuration } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/types';
import { spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';
import { goBackOr } from '@/lib/nav';

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120];
const REBOOK: { days: number | null; label: string }[] = [
  { days: null, label: 'ללא' },
  { days: 21, label: '3 שבועות' },
  { days: 28, label: '4 שבועות' },
  { days: 42, label: '6 שבועות' },
  { days: 56, label: '8 שבועות' },
];

function EditService() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const business = useBusiness();
  const [loading, setLoading] = useState(!isNew);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [rebook, setRebook] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const s = data as Service | null;
        if (s) {
          setName(s.name);
          setDuration(String(s.duration_min));
          setPrice(s.price !== null ? String(s.price) : '');
          setActive(s.is_active);
          setRebook(s.rebook_after_days ?? null);
        }
        setLoading(false);
      });
  }, [id, isNew]);

  async function save() {
    setError(null);
    const durationMin = Number(duration);
    const priceNum = price.trim() === '' ? null : Number(price.replace(',', '.'));
    if (name.trim().length < 1) return setError('נא להזין שם לשירות.');
    if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 600) {
      return setError('משך השירות צריך להיות בין 5 ל־600 דקות.');
    }
    if (priceNum !== null && (Number.isNaN(priceNum) || priceNum < 0)) return setError('המחיר לא תקין.');

    setBusy(true);
    const row = { name: name.trim(), duration_min: durationMin, price: priceNum, is_active: active, rebook_after_days: rebook };
    const { error: err } = isNew
      ? await supabase.from('services').insert({ ...row, business_id: business.id, sort_order: 999 })
      : await supabase.from('services').update(row).eq('id', id);
    setBusy(false);
    if (err) setError(errorMessage(err));
    else goBackOr('/services');
  }

  async function remove() {
    const ok = await confirm('מחיקת שירות', `למחוק את "${name}"? תורים קיימים לא יימחקו.`, {
      confirmText: 'מחיקה',
      destructive: true,
    });
    if (!ok) return;
    const { error: err } = await supabase.from('services').delete().eq('id', id);
    if (err) setError(errorMessage(err));
    else goBackOr('/services');
  }

  if (loading) return <Loading />;

  return (
    <Screen footer={<Button title="שמירה" onPress={save} loading={busy} />}>
      <Stack.Screen options={{ title: isNew ? 'שירות חדש' : 'עריכת שירות' }} />
      <Field label="שם השירות" value={name} onChangeText={setName} placeholder="למשל: עיצוב גבות" />

      <View style={{ gap: spacing.sm }}>
        <Txt variant="small" bold>
          משך
        </Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={formatDuration(d)} selected={Number(duration) === d} onPress={() => setDuration(String(d))} />
          ))}
        </Row>
        <Field label="או משך בדקות" value={duration} onChangeText={setDuration} keyboardType="number-pad" maxLength={3} />
      </View>

      <Field label="מחיר (₪)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="לא חובה" />

      <View style={{ gap: spacing.sm }}>
        <Txt variant="small" bold>
          תזכורת לסידור הבא
        </Txt>
        <Txt variant="small" muted>
          כמה זמן אחרי הטיפול הלקוחה תקבל הודעה ״הגיע הזמן לסידור״. מתבטלת אם היא כבר קבעה תור.
        </Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {REBOOK.map((r) => (
            <Chip key={r.label} label={r.label} selected={rebook === r.days} onPress={() => setRebook(r.days)} />
          ))}
        </Row>
      </View>

      <Toggle text="מוצג ללקוחות" hint="כשכבוי, אי אפשר לקבוע את השירות אונליין." value={active} onValueChange={setActive} />

      <ErrorBox message={error} />
      {!isNew ? <Button title="מחיקת השירות" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}

export default withOwner(EditService);
