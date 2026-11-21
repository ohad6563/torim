import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateStrip } from '@/components/date-strip';
import { SlotGrid } from '@/components/slot-grid';
import { Button, Chip, ErrorBox, Field, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useSlots } from '@/hooks/use-slots';
import {
  addDays,
  formatDayLong,
  formatDuration,
  formatPhone,
  isValidPhone,
  isValidTime,
  timeOf,
  todayIn,
} from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Customer, Service } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';

function NewAppointment() {
  const business = useBusiness();
  const tz = business.timezone;
  const params = useLocalSearchParams<{ day?: string; customerId?: string }>();
  const today = todayIn(tz);
  const [day, setDayState] = useState(params.day && params.day >= today ? params.day : today);
  const days = useMemo(() => Array.from({ length: 61 }, (_, i) => addDays(today, i)), [today]);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceIdState] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const setDay = (d: string) => {
    setDayState(d);
    setSlot(null);
  };
  const setServiceId = (id: string) => {
    setServiceIdState(id);
    setSlot(null);
  };
  const [customTime, setCustomTime] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [matches, setMatches] = useState<Customer[]>([]);
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { slots, loading: slotsLoading } = useSlots(business.id, serviceId, day);

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        const list = (data ?? []) as Service[];
        setServices(list);
        if (list.length === 1) setServiceIdState(list[0].id);
      });
  }, [business.id]);

  // Pre-fill when opened from a customer card.
  useEffect(() => {
    if (!params.customerId) return;
    supabase
      .from('customers')
      .select('*')
      .eq('id', params.customerId)
      .single()
      .then(({ data }) => data && pickCustomer(data as Customer));
  }, [params.customerId]);

  // Suggest existing customers while typing a name or phone.
  useEffect(() => {
    const q = (pickedCustomer ? '' : name.trim() || phone.replace(/\D/g, '')).replace(/[%,()]/g, '');
    if (q.length < 2) return;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .or(`name.ilike."%${q.replace(/["\\]/g, '')}%",phone.ilike."%${q.replace(/["\\]/g, '')}%"`)
        .limit(5);
      setMatches((data ?? []) as Customer[]);
    }, 250);
    return () => clearTimeout(t);
  }, [name, phone, pickedCustomer, business.id]);

  const query = pickedCustomer ? '' : name.trim() || phone.replace(/\D/g, '');
  const visibleMatches = query.length >= 2 ? matches : [];

  function pickCustomer(c: Customer) {
    setPickedCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setMatches([]);
  }

  async function submit() {
    setError(null);
    if (!serviceId) return setError('בחרו שירות.');
    const time = useCustomTime ? customTime : slot ? timeOf(slot, tz) : '';
    if (!isValidTime(time)) return setError(useCustomTime ? 'הזינו שעה בפורמט 14:30' : 'בחרו שעה.');
    if (name.trim().length < 2) return setError('הזינו את שם הלקוח/ה.');
    if (!isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');

    setBusy(true);
    const { error: err } = await supabase.rpc('owner_create_appointment', {
      p_service_id: serviceId,
      p_day: day,
      p_time: time,
      p_name: name.trim(),
      p_phone: phone,
      p_notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    router.back();
  }

  return (
    <Screen footer={<Button title="קביעת התור" onPress={submit} loading={busy} />}>
      <SectionTitle>שירות</SectionTitle>
      {services.length === 0 ? (
        <Txt muted>אין שירותים פעילים. הוסיפו שירות בלשונית ״שירותים״.</Txt>
      ) : (
        <Row style={{ flexWrap: 'wrap' }}>
          {services.map((s) => (
            <Chip
              key={s.id}
              label={`${s.name} · ${formatDuration(s.duration_min)}`}
              selected={s.id === serviceId}
              onPress={() => setServiceId(s.id)}
            />
          ))}
        </Row>
      )}

      <SectionTitle>{formatDayLong(day)}</SectionTitle>
      <DateStrip days={days} selected={day} onSelect={setDay} />

      <SectionTitle
        action={
          <Button
            small
            variant="ghost"
            title={useCustomTime ? 'בחירה מהשעות הפנויות' : 'שעה אחרת'}
            onPress={() => setUseCustomTime((v) => !v)}
          />
        }>
        שעה
      </SectionTitle>
      {useCustomTime ? (
        <Field
          label="שעת התחלה"
          value={customTime}
          onChangeText={setCustomTime}
          placeholder="14:30"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          hint="אפשר לקבוע גם מחוץ לשעות הפעילות. המערכת תמנע רק חפיפה עם תור אחר."
        />
      ) : serviceId ? (
        <SlotGrid slots={slots} loading={slotsLoading} tz={tz} selected={slot} onSelect={setSlot} />
      ) : (
        <Txt muted>בחרו שירות כדי לראות שעות פנויות.</Txt>
      )}

      <SectionTitle>לקוח/ה</SectionTitle>
      <Field
        label="שם"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setPickedCustomer(null);
        }}
        placeholder="שם מלא"
      />
      <Field
        label="טלפון"
        value={phone}
        onChangeText={(t) => {
          setPhone(t);
          setPickedCustomer(null);
        }}
        keyboardType="phone-pad"
        placeholder="050-0000000"
      />
      {visibleMatches.length > 0 ? (
        <View style={styles.matches}>
          <Txt variant="tiny" muted>
            לקוחות קיימים:
          </Txt>
          {visibleMatches.map((c) => (
            <Pressable key={c.id} onPress={() => pickCustomer(c)} style={({ pressed }) => [styles.match, pressed && { opacity: 0.7 }]}>
              <Txt bold style={{ flex: 1 }}>
                {c.name}
              </Txt>
              <Txt variant="small" muted>
                {formatPhone(c.phone)}
              </Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field label="הערות (לא חובה)" value={notes} onChangeText={setNotes} multiline />
      <ErrorBox message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  matches: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  match: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.sm },
});

export default withOwner(NewAppointment);
