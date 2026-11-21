import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';

import { StatusBadge } from '@/components/appointment-card';
import { DateStrip } from '@/components/date-strip';
import { SlotGrid } from '@/components/slot-grid';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorBox,
  Loading,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useFocusData } from '@/hooks/use-focus-data';
import { useSlots } from '@/hooks/use-slots';
import {
  addDays,
  dayOf,
  formatDayLong,
  formatPhone,
  formatPrice,
  timeOf,
  todayIn,
} from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { whatsappUrl } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentStatus } from '@/lib/types';
import { colors, spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';

function AppointmentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const business = useBusiness();
  const tz = business.timezone;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const { data: appt, loading, reload } = useFocusData(async () => {
    const { data, error: err } = await supabase.from('appointments_view').select('*').eq('id', id).maybeSingle();
    if (err) throw err;
    return data as Appointment | null;
  }, [id]);

  if (loading) return <Loading />;
  if (!appt) return <EmptyState icon="alert-circle-outline" title="התור לא נמצא" />;

  const isPast = new Date(appt.ends_at) < new Date();
  const when = `${formatDayLong(appt.local_date)} בשעה ${timeOf(appt.starts_at, tz)}`;

  async function setStatus(status: AppointmentStatus) {
    setError(null);
    setBusy(status);
    const { error: err } = await supabase.from('appointments').update({ status }).eq('id', appt!.id);
    setBusy(null);
    if (err) setError(errorMessage(err));
    else reload();
  }

  async function cancel() {
    const ok = await confirm('ביטול תור', `לבטל את התור של ${appt!.customer_name}?`, {
      confirmText: 'ביטול התור',
      cancelText: 'חזרה',
      destructive: true,
    });
    if (!ok) return;
    await setStatus('cancelled');
    const notify = await confirm('לעדכן את הלקוח/ה?', 'לשלוח הודעת וואטסאפ על ביטול התור?', {
      confirmText: 'שליחה',
      cancelText: 'לא עכשיו',
    });
    if (notify) {
      Linking.openURL(
        whatsappUrl(appt!.customer_phone, `היי ${appt!.customer_name}, התור שלך ב${business.name} ל${when} בוטל.`),
      );
    }
  }

  return (
    <Screen>
      <Card>
        <Row>
          <Txt variant="h2" style={{ flex: 1 }}>
            {appt.customer_name}
          </Txt>
          <StatusBadge status={appt.status} />
        </Row>
        <Txt muted>{formatPhone(appt.customer_phone)}</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          <Button small variant="secondary" icon="call-outline" title="חיוג" onPress={() => Linking.openURL(`tel:${appt.customer_phone}`)} />
          <Button
            small
            variant="secondary"
            icon="logo-whatsapp"
            title="וואטסאפ"
            onPress={() =>
              Linking.openURL(
                whatsappUrl(appt.customer_phone, `היי ${appt.customer_name}, תזכורת לתור שלך ב${business.name} ${when}.`),
              )
            }
          />
          <Button
            small
            variant="ghost"
            icon="person-outline"
            title="כרטיס לקוח"
            onPress={() => router.push({ pathname: '/customer/[id]', params: { id: appt.customer_id } })}
          />
        </Row>
      </Card>

      <Card>
        <Detail label="שירות" value={appt.service_name} />
        <Divider />
        <Detail label="מועד" value={when} />
        <Divider />
        <Detail label="עד" value={timeOf(appt.ends_at, tz)} />
        {appt.price !== null ? (
          <>
            <Divider />
            <Detail label="מחיר" value={formatPrice(appt.price)} />
          </>
        ) : null}
        <Divider />
        <Detail label="נקבע" value={appt.source === 'online' ? 'אונליין על ידי הלקוח/ה' : 'ידנית'} />
        {appt.notes ? (
          <>
            <Divider />
            <Detail label="הערות" value={appt.notes} />
          </>
        ) : null}
      </Card>

      <ErrorBox message={error} />

      {appt.status === 'booked' ? (
        rescheduling ? (
          <Reschedule appt={appt} onDone={() => { setRescheduling(false); reload(); }} onCancel={() => setRescheduling(false)} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {isPast ? (
              <Row>
                <Button
                  style={{ flex: 1 }}
                  title="הגיע/ה ✓"
                  loading={busy === 'completed'}
                  onPress={() => setStatus('completed')}
                />
                <Button
                  style={{ flex: 1 }}
                  variant="secondary"
                  title="לא הגיע/ה"
                  loading={busy === 'no_show'}
                  onPress={() => setStatus('no_show')}
                />
              </Row>
            ) : (
              <Button title="העברה למועד אחר" icon="swap-horizontal" variant="secondary" onPress={() => setRescheduling(true)} />
            )}
            <Button title="ביטול התור" variant="danger" loading={busy === 'cancelled'} onPress={cancel} />
          </View>
        )
      ) : (
        <Button
          title="החזרה לסטטוס ״נקבע״"
          variant="ghost"
          loading={busy === 'booked'}
          onPress={() => setStatus('booked')}
        />
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <Txt muted style={{ width: 70 }}>
        {label}
      </Txt>
      <Txt style={{ flex: 1 }}>{value}</Txt>
    </Row>
  );
}

function Reschedule({ appt, onDone, onCancel }: { appt: Appointment; onDone: () => void; onCancel: () => void }) {
  const business = useBusiness();
  const tz = business.timezone;
  const today = todayIn(tz);
  const days = useMemo(() => Array.from({ length: 61 }, (_, i) => addDays(today, i)), [today]);
  const [day, setDay] = useState(appt.local_date >= today ? appt.local_date : today);
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { slots, loading } = useSlots(business.id, appt.service_id, day);

  async function save() {
    if (!slot) return setError('בחרו שעה חדשה.');
    setBusy(true);
    const duration = new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime();
    const { error: err } = await supabase
      .from('appointments')
      .update({ starts_at: slot, ends_at: new Date(new Date(slot).getTime() + duration).toISOString() })
      .eq('id', appt.id);
    setBusy(false);
    if (err) setError(errorMessage(err));
    else onDone();
  }

  return (
    <Card>
      <SectionTitle>העברה ל{formatDayLong(day)}</SectionTitle>
      <DateStrip days={days} selected={day} onSelect={(d) => { setDay(d); setSlot(null); }} />
      {appt.service_id ? (
        <SlotGrid slots={slots} loading={loading} tz={tz} selected={slot} onSelect={setSlot} />
      ) : (
        <Txt muted>השירות של התור הזה נמחק, לכן אי אפשר להעביר אותו. בטלו וקבעו תור חדש.</Txt>
      )}
      {slot ? (
        <Txt variant="small" color={colors.primary}>
          מועד חדש: {formatDayLong(dayOf(slot, tz))} בשעה {timeOf(slot, tz)}
        </Txt>
      ) : null}
      <ErrorBox message={error} />
      <Row>
        <Button style={{ flex: 1 }} title="שמירה" onPress={save} loading={busy} disabled={!slot} />
        <Button style={{ flex: 1 }} title="ביטול" variant="ghost" onPress={onCancel} />
      </Row>
    </Card>
  );
}

export default withOwner(AppointmentDetails);
