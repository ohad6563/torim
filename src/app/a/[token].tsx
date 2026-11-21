import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/appointment-card';
import { Button, Card, EmptyState, ErrorBox, Loading, Row, Screen, Txt } from '@/components/ui';
import { dayOf, formatDayLong, formatPhone, formatPrice, timeOf } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { PublicAppointment } from '@/lib/types';
import { colors, spacing } from '@/theme';

/** Customer's private appointment page (from the confirmation link): view or cancel. */
export default function MyAppointment() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [appt, setAppt] = useState<PublicAppointment | null>(null);
  const validToken = /^[0-9a-f-]{36}$/i.test(String(token));
  const [loading, setLoading] = useState(validToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!validToken) return;
    let cancelled = false;
    supabase.rpc('get_appointment_by_token', { p_token: token }).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        setError(errorMessage(err));
        setLoading(false);
        return;
      }
      setAppt(((Array.isArray(data) ? data[0] : data) as PublicAppointment | undefined) ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token, validToken, version]);

  if (loading) return <Loading />;
  if (!appt) {
    return (
      <Screen>
        <EmptyState
          icon={error ? 'cloud-offline-outline' : 'search-outline'}
          title={error ? 'אין חיבור כרגע' : 'התור לא נמצא'}
          message={error ?? 'ייתכן שהקישור שגוי.'}
          action={error ? <Button title="נסו שוב" onPress={load} /> : undefined}
        />
      </Screen>
    );
  }

  const tz = appt.timezone;
  const isFuture = new Date(appt.starts_at) > new Date();

  async function cancel() {
    const ok = await confirm('ביטול התור', 'בטוח לבטל את התור?', {
      confirmText: 'ביטול התור',
      cancelText: 'חזרה',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const { data, error: err } = await supabase.rpc('cancel_appointment_by_token', { p_token: token });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else if (!data) setError('אי אפשר לבטל את התור הזה. צרו קשר עם העסק.');
    else load();
  }

  return (
    <Screen>
      <Card style={{ gap: spacing.md }}>
        <Row>
          <Txt variant="h2" style={{ flex: 1 }}>
            {appt.business_name}
          </Txt>
          <StatusBadge status={appt.status} />
        </Row>
        <Row gap={spacing.sm}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          <Txt>
            {appt.service_name}
            {appt.price !== null ? ` · ${formatPrice(appt.price)}` : ''}
          </Txt>
        </Row>
        <Row gap={spacing.sm}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Txt>
            {formatDayLong(dayOf(appt.starts_at, tz))} בשעה {timeOf(appt.starts_at, tz)}
          </Txt>
        </Row>
        {appt.business_address ? (
          <Row gap={spacing.sm}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Txt style={{ flex: 1 }}>{appt.business_address}</Txt>
          </Row>
        ) : null}
      </Card>

      <ErrorBox message={error} />

      <View style={styles.actions}>
        {appt.business_phone ? (
          <Button
            variant="secondary"
            icon="call-outline"
            title={`התקשרות לעסק · ${formatPhone(appt.business_phone)}`}
            onPress={() => Linking.openURL(`tel:${appt.business_phone}`)}
          />
        ) : null}
        {appt.business_address ? (
          <Button
            variant="ghost"
            icon="navigate-outline"
            title="ניווט בוויז"
            onPress={() => Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(appt.business_address!)}`)}
          />
        ) : null}
        {appt.status === 'booked' && isFuture ? (
          <Button variant="danger" title="ביטול התור" onPress={cancel} loading={busy} />
        ) : null}
        <Button
          variant="ghost"
          title="קביעת תור נוסף"
          onPress={() => router.push({ pathname: '/b/[slug]', params: { slug: appt.business_slug } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
