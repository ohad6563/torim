import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { DateStrip } from '@/components/date-strip';
import {
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Field,
  IconButton,
  Loading,
  Row,
  Screen,
  SectionTitle,
  Toggle,
  Txt,
} from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useFocusData } from '@/hooks/use-focus-data';
import { addDays, dayOf, formatDayLong, isValidTime, timeOf, todayIn } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { TimeOff } from '@/lib/types';
import { colors, spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';

function TimeOffScreen() {
  const business = useBusiness();
  const tz = business.timezone;
  const today = todayIn(tz);
  const days = useMemo(() => Array.from({ length: 181 }, (_, i) => addDays(today, i)), [today]);

  const [adding, setAdding] = useState(false);
  const [fromDay, setFromDay] = useState(today);
  const [toDay, setToDay] = useState(today);
  const [fullDay, setFullDay] = useState(true);
  const [start, setStart] = useState('13:00');
  const [end, setEnd] = useState('14:00');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, reload } = useFocusData(async () => {
    const { data: rows, error: err } = await supabase
      .from('time_off')
      .select('*')
      .eq('business_id', business.id)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at');
    if (err) throw err;
    return (rows ?? []) as TimeOff[];
  }, [business.id]);

  async function add() {
    setError(null);
    const to = fullDay ? toDay : fromDay;
    if (to < fromDay) return setError('תאריך הסיום לפני תאריך ההתחלה.');
    if (!fullDay && (!isValidTime(start) || !isValidTime(end) || end <= start)) {
      return setError('שעות לא תקינות (פורמט 13:00, והסיום אחרי ההתחלה).');
    }
    setBusy(true);
    const { error: err } = await supabase.rpc('add_time_off', {
      p_from_day: fromDay,
      p_to_day: to,
      p_start: fullDay ? null : start,
      p_end: fullDay ? null : end,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    setAdding(false);
    setReason('');
    reload();
  }

  async function remove(t: TimeOff) {
    if (!(await confirm('מחיקת חסימה', 'למחוק את החסימה? השעות ייפתחו שוב לקביעת תורים.', { confirmText: 'מחיקה', destructive: true }))) return;
    await supabase.from('time_off').delete().eq('id', t.id);
    reload();
  }

  function describe(t: TimeOff) {
    const sDay = dayOf(t.starts_at, tz);
    // A block that ends exactly at midnight belongs to the previous day.
    const endsAtMidnight = timeOf(t.ends_at, tz) === '00:00';
    const eDay = endsAtMidnight ? addDays(dayOf(t.ends_at, tz), -1) : dayOf(t.ends_at, tz);
    const allDay = timeOf(t.starts_at, tz) === '00:00' && endsAtMidnight;
    if (allDay) return sDay === eDay ? `${formatDayLong(sDay)} · כל היום` : `${formatDayLong(sDay)} – ${formatDayLong(eDay)}`;
    if (sDay === eDay) return `${formatDayLong(sDay)} · ${timeOf(t.starts_at, tz)}–${timeOf(t.ends_at, tz)}`;
    return `${formatDayLong(sDay)} ${timeOf(t.starts_at, tz)} – ${formatDayLong(eDay)} ${timeOf(t.ends_at, tz)}`;
  }

  return (
    <Screen footer={!adding ? <Button title="חסימה חדשה" icon="add" onPress={() => setAdding(true)} /> : undefined}>
      <Txt muted>בזמנים חסומים הלקוחות לא יוכלו לקבוע תור. תורים שכבר נקבעו לא מתבטלים אוטומטית.</Txt>

      {adding ? (
        <Card style={{ gap: spacing.md }}>
          <SectionTitle>{fullDay ? `מ${formatDayLong(fromDay)}` : formatDayLong(fromDay)}</SectionTitle>
          <DateStrip
            days={days}
            selected={fromDay}
            onSelect={(d) => {
              setFromDay(d);
              if (toDay < d) setToDay(d);
            }}
          />
          <Row>
            <Txt bold style={{ flex: 1 }}>
              ימים שלמים
            </Txt>
            <Toggle value={fullDay} onValueChange={setFullDay} />
          </Row>
          {fullDay ? (
            <>
              <Txt bold>עד {formatDayLong(toDay)} (כולל)</Txt>
              <DateStrip days={days.filter((d) => d >= fromDay)} selected={toDay} onSelect={setToDay} />
            </>
          ) : (
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="משעה" value={start} onChangeText={setStart} maxLength={5} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="עד שעה" value={end} onChangeText={setEnd} maxLength={5} keyboardType="numbers-and-punctuation" />
              </View>
            </Row>
          )}
          <Field label="סיבה (לא חובה)" value={reason} onChangeText={setReason} placeholder="חופשה, השתלמות..." />
          <ErrorBox message={error} />
          <Row>
            <Button style={{ flex: 1 }} title="הוספה" onPress={add} loading={busy} />
            <Button style={{ flex: 1 }} title="ביטול" variant="ghost" onPress={() => setAdding(false)} />
          </Row>
        </Card>
      ) : null}

      {loading ? (
        <Loading />
      ) : !data?.length ? (
        !adding && <EmptyState icon="airplane-outline" title="אין חסימות קרובות" />
      ) : (
        data.map((t) => (
          <Card key={t.id}>
            <Row>
              <View style={{ flex: 1 }}>
                <Txt bold>{describe(t)}</Txt>
                {t.reason ? (
                  <Txt variant="small" muted>
                    {t.reason}
                  </Txt>
                ) : null}
              </View>
              <IconButton icon="trash-outline" color={colors.danger} label="מחיקה" onPress={() => remove(t)} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}

export default withOwner(TimeOffScreen);
