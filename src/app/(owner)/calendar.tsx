import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppointmentCard } from '@/components/appointment-card';
import { DateStrip } from '@/components/date-strip';
import { Button, EmptyState, ErrorBox, IconButton, Loading, Row, Screen, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useFocusData } from '@/hooks/use-focus-data';
import { addDays, formatDayLong, formatPrice, monthName, todayIn, weekdayOf } from '@/lib/dates';
import { showMessage } from '@/lib/dialogs';
import { bookingUrl, shareLink } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';

export default function Calendar() {
  const business = useBusiness();
  const tz = business.timezone;
  const today = todayIn(tz);
  const [day, setDay] = useState(today);

  // The strip shows the Sunday–Saturday week of the selected day.
  const weekStart = addDays(day, -weekdayOf(day));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const { data, loading, refreshing, error, refresh } = useFocusData(async () => {
    const [dayRes, marksRes] = await Promise.all([
      supabase
        .from('appointments_view')
        .select('*')
        .eq('business_id', business.id)
        .eq('local_date', day)
        .order('starts_at'),
      supabase
        .from('appointments_view')
        .select('local_date')
        .eq('business_id', business.id)
        .eq('status', 'booked')
        .gte('local_date', days[0])
        .lte('local_date', days[days.length - 1]),
    ]);
    if (dayRes.error) throw dayRes.error;
    return {
      appointments: (dayRes.data ?? []) as Appointment[],
      marked: new Set((marksRes.data ?? []).map((r: { local_date: string }) => r.local_date)),
    };
  }, [business.id, day, days]);

  const appointments = data?.appointments ?? [];
  const active = appointments.filter((a) => a.status !== 'cancelled');
  const expected = active.reduce((sum, a) => sum + (a.status === 'no_show' ? 0 : Number(a.price ?? 0)), 0);

  async function share() {
    const copied = await shareLink(bookingUrl(business.slug), `לקביעת תור ב${business.name}:`);
    if (copied) showMessage('הקישור הועתק', bookingUrl(business.slug));
  }

  return (
      <Screen
        refreshing={refreshing}
        onRefresh={refresh}
        footer={
          <Button
            title="תור חדש"
            icon="add"
            onPress={() => router.push({ pathname: '/appointment/new', params: { day } })}
          />
        }>
        <Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => [styles.shareBanner, pressed && { opacity: 0.8 }]}>
          <View style={{ flex: 1 }}>
            <Txt bold color={colors.primary}>
              שתפו את קישור קביעת התורים
            </Txt>
            <Txt variant="tiny" muted numberOfLines={1}>
              {bookingUrl(business.slug)}
            </Txt>
          </View>
          <IconButton icon="share-social-outline" label="שיתוף קישור" onPress={share} />
        </Pressable>

        <View style={{ gap: spacing.sm }}>
          <Row>
            <IconButton icon="chevron-forward" label="שבוע קודם" onPress={() => setDay(addDays(day, -7))} />
            <Txt variant="h3" center style={{ flex: 1 }}>
              {monthName(weekStart) === monthName(addDays(weekStart, 6)) ? `${monthName(weekStart)} ${weekStart.slice(0, 4)}` : `${monthName(weekStart)}–${monthName(addDays(weekStart, 6))} ${addDays(weekStart, 6).slice(0, 4)}`}
            </Txt>
            <IconButton icon="chevron-back" label="שבוע הבא" onPress={() => setDay(addDays(day, 7))} />
          </Row>
          <DateStrip days={days} selected={day} onSelect={setDay} marked={data?.marked} fill />
          <Row>
            <Txt bold style={{ flex: 1 }}>
              {formatDayLong(day)}
            </Txt>
            {day !== today ? <Button title="חזרה להיום" small variant="ghost" onPress={() => setDay(today)} /> : null}
          </Row>
        </View>

        {active.length > 0 ? (
          <Row style={styles.summary}>
            <Txt variant="small" muted style={{ flex: 1 }}>
              {active.length === 1 ? 'תור אחד' : `${active.length} תורים`}
            </Txt>
            {expected > 0 ? (
              <Txt variant="small" muted>
                צפי הכנסה: {formatPrice(expected)}
              </Txt>
            ) : null}
          </Row>
        ) : null}

        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title="אין תורים ביום הזה"
            message="תורים שהלקוחות יקבעו דרך הקישור יופיעו כאן אוטומטית."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {appointments.map((a) => (
              <AppointmentCard
                key={a.id}
                appt={a}
                tz={tz}
                onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: a.id } })}
              />
            ))}
          </View>
        )}
      </Screen>
  );
}

const styles = StyleSheet.create({
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  summary: { paddingHorizontal: spacing.xs },
});
