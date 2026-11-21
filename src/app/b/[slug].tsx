import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { DateStrip } from '@/components/date-strip';
import { SlotGrid } from '@/components/slot-grid';
import { Button, Card, EmptyState, ErrorBox, Field, Loading, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useSlots } from '@/hooks/use-slots';
import {
  addDays,
  dayOf,
  formatDayLong,
  formatDuration,
  formatPhone,
  formatPrice,
  isValidPhone,
  timeOf,
  todayIn,
  weekdayOf,
} from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Business, Service } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';

type Step = 'service' | 'time' | 'details' | 'done';

/** Public booking page that customers open from the business's link. No account needed. */
export default function BookingPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [openWeekdays, setOpenWeekdays] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<Service | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: b } = await supabase.from('businesses').select('*').eq('slug', String(slug).toLowerCase()).maybeSingle();
      if (b) {
        const [s, h] = await Promise.all([
          supabase.from('services').select('*').eq('business_id', b.id).eq('is_active', true).order('sort_order').order('created_at'),
          supabase.from('working_hours').select('weekday').eq('business_id', b.id),
        ]);
        setBusiness(b as Business);
        setServices((s.data ?? []) as Service[]);
        setOpenWeekdays(new Set((h.data ?? []).map((r: { weekday: number }) => r.weekday)));
      }
      setLoading(false);
    })();
  }, [slug]);

  const tz = business?.timezone ?? 'Asia/Jerusalem';
  const days = useMemo(() => {
    if (!business) return [];
    const today = todayIn(tz);
    return Array.from({ length: business.max_days_ahead + 1 }, (_, i) => addDays(today, i));
  }, [business, tz]);
  const closedDays = useMemo(() => new Set(days.filter((d) => !openWeekdays.has(weekdayOf(d)))), [days, openWeekdays]);

  const [pickedDay, setDay] = useState('');
  // Until the customer picks a day, default to the first open one.
  const day = pickedDay || (days.find((d) => !closedDays.has(d)) ?? days[0] ?? '');

  const { slots, loading: slotsLoading } = useSlots(business?.id, service?.id ?? null, day, refreshKey);

  if (loading) return <Loading />;
  if (!business) {
    return (
      <Screen>
        <EmptyState icon="search-outline" title="העסק לא נמצא" message="ייתכן שהקישור שגוי או שהעסק שינה את הכתובת." />
      </Screen>
    );
  }

  async function book() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם מלא.');
    if (!isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');
    setBusy(true);
    const { data, error: err } = await supabase.rpc('book_appointment', {
      p_business_id: business!.id,
      p_service_id: service!.id,
      p_starts_at: slot,
      p_name: name.trim(),
      p_phone: phone,
      p_notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError(errorMessage(err));
      if (/SLOT_TAKEN/.test(err.message)) {
        // Someone else just took this time: go back and show fresh availability.
        setSlot(null);
        setRefreshKey((k) => k + 1);
        setStep('time');
      }
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setToken(row?.cancel_token ?? null);
    setStep('done');
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Txt variant="h2" color={colors.textOnPrimary}>
          {business.name.trim().charAt(0)}
        </Txt>
      </View>
      <Txt variant="h2" center>
        {business.name}
      </Txt>
      {business.description ? (
        <Txt muted center>
          {business.description}
        </Txt>
      ) : null}
      <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }} gap={spacing.lg}>
        {business.address ? (
          <Row gap={spacing.xs}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Txt variant="small" muted>
              {business.address}
            </Txt>
          </Row>
        ) : null}
        {business.phone ? (
          <Row gap={spacing.xs}>
            <Ionicons name="call-outline" size={16} color={colors.textMuted} />
            <Txt variant="small" muted>
              {formatPhone(business.phone)}
            </Txt>
          </Row>
        ) : null}
      </Row>
    </View>
  );

  if (step === 'done') {
    return (
      <Screen>
        <Stack.Screen options={{ title: business.name }} />
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={colors.textOnPrimary} />
          </View>
          <Txt variant="h2" center>
            התור נקבע!
          </Txt>
          <Txt center>
            {service!.name} ב{business.name}
            {'\n'}
            {formatDayLong(dayOf(slot!, tz))} בשעה {timeOf(slot!, tz)}
          </Txt>
          {business.address ? (
            <Txt muted center>
              {business.address}
            </Txt>
          ) : null}
        </View>
        {token ? (
          <Button
            title="צפייה בתור / ביטול"
            variant="secondary"
            onPress={() => router.push({ pathname: '/a/[token]', params: { token } })}
          />
        ) : null}
        {business.address ? (
          <Button
            title="ניווט לעסק"
            variant="ghost"
            icon="navigate-outline"
            onPress={() => Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(business.address!)}`)}
          />
        ) : null}
        <Txt variant="small" muted center>
          שמרו את הקישור לתור כדי שתוכלו לבטל אותו בעתיד.
        </Txt>
      </Screen>
    );
  }

  const footer =
    step === 'time' ? (
      <Row>
        <Button style={{ flex: 1 }} title="המשך" disabled={!slot} onPress={() => setStep('details')} />
        <Button style={{ flex: 1 }} title="חזרה" variant="ghost" onPress={() => setStep('service')} />
      </Row>
    ) : step === 'details' ? (
      <Row>
        <Button style={{ flex: 1 }} title="אישור וקביעת התור" onPress={book} loading={busy} />
        <Button style={{ flex: 1 }} title="חזרה" variant="ghost" onPress={() => setStep('time')} />
      </Row>
    ) : undefined;

  return (
    <Screen footer={footer}>
      <Stack.Screen options={{ title: business.name }} />
      {header}
      <Steps step={step} />

      {step === 'service' ? (
        <>
          <SectionTitle>בחרו שירות</SectionTitle>
          {services.length === 0 ? (
            <Txt muted center>
              העסק עדיין לא פתח שירותים לקביעה אונליין.
            </Txt>
          ) : (
            services.map((s) => (
              <Card
                key={s.id}
                onPress={() => {
                  setService(s);
                  setSlot(null);
                  setStep('time');
                }}>
                <Row>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt bold>{s.name}</Txt>
                    <Txt variant="small" muted>
                      {formatDuration(s.duration_min)}
                    </Txt>
                  </View>
                  {s.price !== null ? <Txt bold color={colors.primary}>{formatPrice(s.price)}</Txt> : null}
                  <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                </Row>
              </Card>
            ))
          )}
        </>
      ) : null}

      {step === 'time' && service ? (
        <>
          <Card style={styles.summary}>
            <Txt bold>{service.name}</Txt>
            <Txt variant="small" muted>
              {formatDuration(service.duration_min)}
              {service.price !== null ? ` · ${formatPrice(service.price)}` : ''}
            </Txt>
          </Card>
          <SectionTitle>{day ? formatDayLong(day) : 'בחרו תאריך'}</SectionTitle>
          <DateStrip
            days={days}
            selected={day}
            disabledDays={closedDays}
            onSelect={(d) => {
              setDay(d);
              setSlot(null);
            }}
          />
          <SectionTitle>בחרו שעה</SectionTitle>
          <SlotGrid
            slots={slots}
            loading={slotsLoading}
            tz={tz}
            selected={slot}
            onSelect={setSlot}
            emptyText="אין שעות פנויות ביום הזה. נסו יום אחר."
          />
          <ErrorBox message={error} />
        </>
      ) : null}

      {step === 'details' && service && slot ? (
        <>
          <Card style={styles.summary}>
            <Txt bold>{service.name}</Txt>
            <Txt variant="small">
              {formatDayLong(dayOf(slot, tz))} בשעה {timeOf(slot, tz)}
            </Txt>
            {service.price !== null ? (
              <Txt variant="small" muted>
                מחיר: {formatPrice(service.price)} (תשלום בעסק)
              </Txt>
            ) : null}
          </Card>
          <SectionTitle>הפרטים שלך</SectionTitle>
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
          <Field label="הערה לעסק (לא חובה)" value={notes} onChangeText={setNotes} multiline maxLength={300} />
          <ErrorBox message={error} />
          <Txt variant="tiny" muted center>
            הפרטים נשמרים אצל העסק לצורך ניהול התור בלבד.
          </Txt>
        </>
      ) : null}
    </Screen>
  );
}

function Steps({ step }: { step: Step }) {
  const order: Step[] = ['service', 'time', 'details'];
  const labels = ['שירות', 'מועד', 'פרטים'];
  const current = order.indexOf(step);
  return (
    <Row style={{ justifyContent: 'center' }} gap={spacing.sm}>
      {labels.map((label, i) => (
        <Row key={label} gap={spacing.xs}>
          <View style={[styles.stepDot, i <= current && styles.stepDotActive]}>
            <Txt variant="tiny" bold color={i <= current ? colors.textOnPrimary : colors.textMuted}>
              {i + 1}
            </Txt>
          </View>
          <Txt variant="small" bold={i === current} muted={i !== current}>
            {label}
          </Txt>
          {i < labels.length - 1 ? <View style={styles.stepLine} /> : null}
        </Row>
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 2 },
  success: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepLine: { width: 18, height: 2, backgroundColor: colors.border, marginStart: spacing.xs },
});
