import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateStrip } from '@/components/date-strip';
import { SlotGrid } from '@/components/slot-grid';
import { Appear, Button, EmptyState, ErrorBox, Field, IconButton, Loading, Row, Screen, Txt } from '@/components/ui';
import { usePublicBusiness } from '@/hooks/use-public-business';
import { useSlots } from '@/hooks/use-slots';
import {
  addDays,
  dayOf,
  formatDayLong,
  formatDuration,
  formatPrice,
  isValidPhone,
  timeOf,
  todayIn,
  weekdayOf,
} from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { addMyToken } from '@/lib/my-appointments';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/types';
import { colors, radius, spacing, springs } from '@/theme';

type Step = 'service' | 'time' | 'details' | 'done';
const STEPS: Step[] = ['service', 'time', 'details'];
const STEP_TITLES: Record<Step, string> = {
  service: 'איזה טיפול?',
  time: 'מתי נוח לך?',
  details: 'כמעט סיימנו',
  done: '',
};

/** Customer booking flow: service → date & time → details → confirmation. No account needed. */
export default function BookFlow() {
  const params = useLocalSearchParams<{ slug: string; service?: string }>();
  const { data, loading } = usePublicBusiness(params.slug);

  const [step, setStep] = useState<Step>(params.service ? 'time' : 'service');
  const [serviceId, setServiceId] = useState<string | null>(params.service ?? null);
  const [pickedDay, setPickedDay] = useState('');
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  const business = data?.business;
  const tz = business?.timezone ?? 'Asia/Jerusalem';
  const service = data?.services.find((s) => s.id === serviceId) ?? null;

  const days = useMemo(() => {
    if (!business) return [];
    const today = todayIn(tz);
    return Array.from({ length: business.max_days_ahead + 1 }, (_, i) => addDays(today, i));
  }, [business, tz]);
  const closedDays = useMemo(() => {
    const open = new Set((data?.hours ?? []).map((h) => h.weekday));
    return new Set(days.filter((d) => !open.has(weekdayOf(d))));
  }, [days, data]);
  // Until the customer picks a day, default to the first open one.
  const day = pickedDay || (days.find((d) => !closedDays.has(d)) ?? days[0] ?? '');

  const { slots, loading: slotsLoading } = useSlots(business?.id, serviceId, day, refreshKey);

  if (loading) return <Loading />;
  if (!data || !business) {
    return (
      <Screen>
        <EmptyState icon="search-outline" title="העסק לא נמצא" message="ייתכן שהקישור שגוי." />
      </Screen>
    );
  }

  function goBack() {
    setError(null);
    if (step === 'details') setStep('time');
    else if (step === 'time' && !params.service) setStep('service');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function pickService(s: Service) {
    setServiceId(s.id);
    setSlot(null);
    setStep('time');
  }

  async function book() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם מלא.');
    if (!isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');
    setBusy(true);
    const { data: res, error: err } = await supabase.rpc('book_appointment', {
      p_business_id: business!.id,
      p_service_id: serviceId,
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
    const row = Array.isArray(res) ? res[0] : res;
    const t: string | null = row?.cancel_token ?? null;
    if (t) await addMyToken(t);
    setToken(t);
    haptics.success();
    setStep('done');
  }

  if (step === 'done' && service && slot) {
    return <Success businessName={business.name} address={business.address} service={service} slot={slot} tz={tz} token={token} />;
  }

  const stepIndex = STEPS.indexOf(step);
  const footer =
    step === 'time' ? (
      <Button title={slot ? `המשך · ${timeOf(slot, tz)}` : 'בחרו שעה'} disabled={!slot} onPress={() => setStep('details')} />
    ) : step === 'details' ? (
      <Button title="אישור וקביעת התור" onPress={book} loading={busy} />
    ) : undefined;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-forward" label="חזרה" onPress={goBack} filled />
        <View style={{ flex: 1 }}>
          <Txt variant="tiny" muted center>
            {business.name}
          </Txt>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <Progress index={stepIndex} />

      <Screen footer={footer} edges={['bottom']}>
        <Animated.View key={step} entering={FadeInLeft.duration(380).easing(Easing.out(Easing.cubic))} style={{ gap: spacing.lg }}>
          <Txt variant="h1">{STEP_TITLES[step]}</Txt>

          {step === 'service' ? (
            <View style={styles.list}>
              {data.services.map((s, i) => (
                <Appear key={s.id} index={i}>
                  <Pressable
                    onPress={() => {
                      haptics.select();
                      pickService(s);
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.serviceRow, pressed && { opacity: 0.6 }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="h3">{s.name}</Txt>
                      <Txt variant="small" muted>
                        {formatDuration(s.duration_min)}
                      </Txt>
                    </View>
                    {s.price !== null ? (
                      <Txt variant="h3" weight="light">
                        {formatPrice(s.price)}
                      </Txt>
                    ) : null}
                    <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                  </Pressable>
                </Appear>
              ))}
              {data.services.length === 0 ? <Txt muted>אין כרגע טיפולים זמינים לקביעה אונליין.</Txt> : null}
            </View>
          ) : null}

          {step === 'time' && service ? (
            <>
              <Pressable onPress={() => setStep('service')} style={styles.summary} accessibilityRole="button" accessibilityLabel="החלפת טיפול">
                <View style={{ flex: 1 }}>
                  <Txt bold>{service.name}</Txt>
                  <Txt variant="small" muted>
                    {formatDuration(service.duration_min)}
                    {service.price !== null ? ` · ${formatPrice(service.price)}` : ''}
                  </Txt>
                </View>
                <Txt variant="small" muted>
                  החלפה
                </Txt>
              </Pressable>
              <Txt variant="small" muted>
                {formatDayLong(day)}
              </Txt>
              <DateStrip
                days={days}
                selected={day}
                disabledDays={closedDays}
                onSelect={(d) => {
                  setPickedDay(d);
                  setSlot(null);
                }}
              />
              <SlotGrid
                key={`${day}-${refreshKey}`}
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
              <View style={styles.ticket}>
                <Txt label variant="tiny">
                  התור שלך
                </Txt>
                <Txt variant="h2">{service.name}</Txt>
                <Txt>
                  {formatDayLong(dayOf(slot, tz))} · {timeOf(slot, tz)}
                </Txt>
                {service.price !== null ? (
                  <Txt variant="small" muted>
                    {formatPrice(service.price)} · התשלום בסטודיו
                  </Txt>
                ) : null}
              </View>
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
              <Field label="הערה (לא חובה)" value={notes} onChangeText={setNotes} multiline maxLength={300} />
              <ErrorBox message={error} />
              <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
                <Txt variant="tiny" faint center>
                  הפרטים נשמרים אצל העסק לצורך ניהול התור בלבד ·{' '}
                  <Txt variant="tiny" muted style={{ textDecorationLine: 'underline' }}>
                    מדיניות פרטיות
                  </Txt>
                </Txt>
              </Pressable>
            </>
          ) : null}
        </Animated.View>
      </Screen>
    </SafeAreaView>
  );
}

/** Three-segment progress bar; the active segment fills with a spring. */
function Progress({ index }: { index: number }) {
  return (
    <Row gap={6} style={styles.progress}>
      {STEPS.map((s, i) => (
        <Segment key={s} filled={i <= index} />
      ))}
    </Row>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const v = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    v.set(withSpring(filled ? 1 : 0, springs.gentle));
  }, [filled, v]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

function Success({
  businessName,
  address,
  service,
  slot,
  tz,
  token,
}: {
  businessName: string;
  address: string | null;
  service: Service;
  slot: string;
  tz: string;
  token: string | null;
}) {
  const ring = useSharedValue(0.4);
  const ringOpacity = useSharedValue(0.9);
  useEffect(() => {
    ring.set(withDelay(150, withTiming(2.4, { duration: 1100, easing: Easing.out(Easing.cubic) })));
    ringOpacity.set(withDelay(150, withTiming(0, { duration: 1100 })));
  }, [ring, ringOpacity]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.value }], opacity: ringOpacity.value }));

  return (
    <SafeAreaView style={[styles.screen, styles.success]} edges={['top', 'bottom']}>
      <View style={styles.successBadgeWrap}>
        <Animated.View style={[styles.successRing, ringStyle]} />
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.successBadge}>
          <Ionicons name="checkmark" size={44} color={colors.textOnPrimary} />
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(350).duration(600)} style={{ gap: spacing.sm, alignItems: 'center' }}>
        <Txt variant="display" center>
          נתראה!
        </Txt>
        <Txt muted center>
          {service.name} ב{businessName}
        </Txt>
        <Txt variant="h3" center>
          {formatDayLong(dayOf(slot, tz))} · {timeOf(slot, tz)}
        </Txt>
        {address ? (
          <Txt variant="small" faint center>
            {address}
          </Txt>
        ) : null}
      </Animated.View>
      <Animated.View entering={FadeIn.delay(800).duration(600)} style={styles.successActions}>
        {token ? (
          <Button
            title="פרטי התור"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/a/[token]', params: { token } })}
          />
        ) : null}
        <Button title="סיום" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Txt variant="tiny" faint center>
          התור נשמר במכשיר הזה תחת ״התורים שלי״.
        </Txt>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  progress: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  segmentFill: { flex: 1, backgroundColor: colors.text, transformOrigin: 'right' },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ticket: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
  success: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  successBadgeWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  successRing: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, borderColor: colors.text },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successActions: { width: '100%', maxWidth: 360, gap: spacing.md, marginTop: spacing.lg },
});
