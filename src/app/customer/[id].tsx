import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { AppointmentCard } from '@/components/appointment-card';
import { Button, Card, EmptyState, ErrorBox, Field, Loading, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useFocusData } from '@/hooks/use-focus-data';
import { formatDayLong, formatPhone, formatPrice, isValidPhone, normalizePhone } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { whatsappUrl } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import type { Appointment, Customer } from '@/lib/types';
import { spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';
import { goBackOr } from '@/lib/nav';

function CustomerDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const business = useBusiness();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, reload } = useFocusData(async () => {
    const [c, a] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).maybeSingle(),
      supabase.from('appointments_view').select('*').eq('customer_id', id).order('starts_at', { ascending: false }),
    ]);
    if (c.error) throw c.error;
    const appointments = (a.data ?? []) as Appointment[];
    const now = Date.now();
    const isUpcoming = (x: Appointment) => x.status === 'booked' && new Date(x.starts_at).getTime() > now;
    return {
      customer: c.data as Customer | null,
      appointments,
      upcoming: appointments.filter(isUpcoming).reverse(),
      history: appointments.filter((x) => !isUpcoming(x)),
    };
  }, [id]);

  const customer = data?.customer;

  function startEditing() {
    if (!customer) return;
    setName(customer.name);
    setPhone(customer.phone);
    setNotes(customer.notes ?? '');
    setError(null);
    setEditing(true);
  }

  if (loading) return <Loading />;
  if (!customer) return <EmptyState icon="person-outline" title="הלקוח/ה לא נמצא/ה" />;

  const { appointments, upcoming, history } = data!;
  const visits = appointments.filter((a) => a.status === 'completed');
  const noShows = appointments.filter((a) => a.status === 'no_show').length;
  const total = visits.reduce((s, a) => s + Number(a.price ?? 0), 0);

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם.');
    if (!isValidPhone(phone)) return setError('מספר הטלפון לא תקין.');
    setBusy(true);
    const { error: err } = await supabase
      .from('customers')
      .update({ name: name.trim(), phone: normalizePhone(phone), notes: notes.trim() || null })
      .eq('id', customer!.id);
    setBusy(false);
    if (err) return setError(errorMessage(err));
    setEditing(false);
    reload();
  }

  async function remove() {
    const ok = await confirm('מחיקת לקוח/ה', 'למחוק את הלקוח/ה ואת כל היסטוריית התורים? אי אפשר לבטל את הפעולה.', {
      confirmText: 'מחיקה',
      destructive: true,
    });
    if (!ok) return;
    const { error: err } = await supabase.from('customers').delete().eq('id', customer!.id);
    if (err) setError(errorMessage(err));
    else goBackOr('/customers');
  }

  return (
    <Screen>
      {editing ? (
        <Card>
          <Field label="שם" value={name} onChangeText={setName} />
          <Field label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="הערות פנימיות" value={notes} onChangeText={setNotes} multiline hint="רק את/ה רואה את ההערות" />
          <ErrorBox message={error} />
          <Row>
            <Button style={{ flex: 1 }} title="שמירה" onPress={save} loading={busy} />
            <Button style={{ flex: 1 }} title="ביטול" variant="ghost" onPress={() => setEditing(false)} />
          </Row>
          <Button title="מחיקת לקוח/ה" variant="danger" small onPress={remove} />
        </Card>
      ) : (
        <Card>
          <Row>
            <Txt variant="h2" style={{ flex: 1 }}>
              {customer.name}
            </Txt>
            <Button small variant="ghost" icon="create-outline" title="עריכה" onPress={startEditing} />
          </Row>
          <Txt muted>{formatPhone(customer.phone)}</Txt>
          {customer.notes ? <Txt variant="small">{customer.notes}</Txt> : null}
          <Row style={{ flexWrap: 'wrap' }}>
            <Button small variant="secondary" icon="call-outline" title="חיוג" onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
            <Button
              small
              variant="secondary"
              icon="logo-whatsapp"
              title="וואטסאפ"
              onPress={() => Linking.openURL(whatsappUrl(customer.phone, `היי ${customer.name}, `))}
            />
            <Button
              small
              icon="add"
              title="תור חדש"
              onPress={() => router.push({ pathname: '/appointment/new', params: { customerId: customer.id } })}
            />
          </Row>
        </Card>
      )}

      <Row>
        <Stat label="ביקורים" value={String(visits.length)} />
        <Stat label="לא הגיע/ה" value={String(noShows)} />
        <Stat label="סה״כ" value={formatPrice(total) || '₪0'} />
      </Row>

      {upcoming.length > 0 ? (
        <>
          <SectionTitle>תורים קרובים</SectionTitle>
          {upcoming.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              tz={business.timezone}
              showCustomer={false}
              showDate={formatDayLong(a.local_date)}
              onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: a.id } })}
            />
          ))}
        </>
      ) : null}

      <SectionTitle>היסטוריה</SectionTitle>
      {history.length === 0 ? (
        <Txt muted>אין עדיין תורים קודמים.</Txt>
      ) : (
        history.map((a) => (
          <AppointmentCard
            key={a.id}
            appt={a}
            tz={business.timezone}
            showCustomer={false}
            showDate={formatDayLong(a.local_date)}
            onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: a.id } })}
          />
        ))
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
      <Txt variant="h3">{value}</Txt>
      <Txt variant="tiny" muted>
        {label}
      </Txt>
    </Card>
  );
}

export default withOwner(CustomerDetails);
