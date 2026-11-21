import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, ErrorBox, IconButton, Loading, Row, Screen, Toggle, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { isValidTime, trimTime, WEEKDAYS } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { WorkingHours } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';

type Range = { start: string; end: string };

function Hours() {
  const business = useBusiness();
  const [week, setWeek] = useState<Range[][] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('working_hours')
      .select('*')
      .eq('business_id', business.id)
      .order('start_time')
      .then(({ data }) => {
        const w: Range[][] = Array.from({ length: 7 }, () => []);
        for (const h of (data ?? []) as WorkingHours[]) {
          w[h.weekday].push({ start: trimTime(h.start_time), end: trimTime(h.end_time) });
        }
        setWeek(w);
      });
  }, [business.id]);

  if (!week) return <Loading />;

  const update = (day: number, fn: (ranges: Range[]) => Range[]) =>
    setWeek((w) => w!.map((r, i) => (i === day ? fn(r) : r)));

  async function save() {
    setError(null);
    for (let d = 0; d < 7; d++) {
      const ranges = [...week![d]].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < ranges.length; i++) {
        const { start, end } = ranges[i];
        if (!isValidTime(start) || !isValidTime(end)) return setError(`יום ${WEEKDAYS[d]}: שעה לא תקינה (פורמט 09:00).`);
        if (end <= start) return setError(`יום ${WEEKDAYS[d]}: שעת הסיום חייבת להיות אחרי שעת ההתחלה.`);
        if (i > 0 && start < ranges[i - 1].end) return setError(`יום ${WEEKDAYS[d]}: יש חפיפה בין טווחי השעות.`);
      }
    }
    setBusy(true);
    const rows = week!.flatMap((ranges, weekday) =>
      ranges.map((r) => ({ business_id: business.id, weekday, start_time: r.start, end_time: r.end })),
    );
    const del = await supabase.from('working_hours').delete().eq('business_id', business.id);
    const ins = del.error || rows.length === 0 ? { error: del.error } : await supabase.from('working_hours').insert(rows);
    setBusy(false);
    if (ins.error) setError(errorMessage(ins.error));
    else router.back();
  }

  return (
    <Screen footer={<Button title="שמירה" onPress={save} loading={busy} />}>
      <Txt muted>אפשר להגדיר כמה טווחים ביום, למשל כדי לקבוע הפסקת צהריים.</Txt>
      {week.map((ranges, day) => {
        const open = ranges.length > 0;
        return (
          <Card key={day} style={{ gap: spacing.md }}>
            <Row>
              <Txt bold style={{ flex: 1 }}>
                יום {WEEKDAYS[day]}
              </Txt>
              <Txt variant="small" muted>
                {open ? 'פתוח' : 'סגור'}
              </Txt>
              <Toggle value={open} onValueChange={(v) => update(day, () => (v ? [{ start: '09:00', end: '18:00' }] : []))} />
            </Row>
            {ranges.map((r, i) => (
              <Row key={i}>
                <TimeInput value={r.start} onChange={(t) => update(day, (rs) => rs.map((x, j) => (j === i ? { ...x, start: t } : x)))} />
                <Txt muted>עד</Txt>
                <TimeInput value={r.end} onChange={(t) => update(day, (rs) => rs.map((x, j) => (j === i ? { ...x, end: t } : x)))} />
                <View style={{ flex: 1 }} />
                <IconButton
                  icon="trash-outline"
                  color={colors.danger}
                  label="הסרת טווח"
                  onPress={() => update(day, (rs) => rs.filter((_, j) => j !== i))}
                />
              </Row>
            ))}
            {open ? (
              <Button
                small
                variant="ghost"
                icon="add"
                title="הוספת טווח"
                onPress={() => update(day, (rs) => [...rs, { start: rs[rs.length - 1]?.end ?? '09:00', end: '20:00' }])}
              />
            ) : null}
          </Card>
        );
      })}
      <ErrorBox message={error} />
    </Screen>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => {
        // Auto-insert the colon: "930" -> "9:30", "0930" -> "09:30"
        const digits = t.replace(/\D/g, '').slice(0, 4);
        onChange(digits.length > 2 ? `${digits.slice(0, digits.length - 2).padStart(2, '0')}:${digits.slice(-2)}` : digits);
      }}
      onBlur={() => {
        const d = value.replace(/\D/g, '');
        if (d.length > 0 && d.length <= 2) onChange(`${d.padStart(2, '0')}:00`);
      }}
      keyboardType="number-pad"
      maxLength={5}
      placeholder="09:00"
      placeholderTextColor={colors.textMuted}
      style={[styles.time, !isValidTime(value) && { borderColor: colors.danger }]}
    />
  );
}

const styles = StyleSheet.create({
  time: {
    width: 76,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    textAlign: 'center',
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});

export default withOwner(Hours);
