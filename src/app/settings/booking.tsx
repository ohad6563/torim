
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ErrorBox, Row, Screen, Txt } from '@/components/ui';
import { useAuth, useBusiness } from '@/context/auth';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';
import { withOwner } from '@/components/owner-gate';
import { goBackOr } from '@/lib/nav';

const INTERVALS = [10, 15, 20, 30, 60];
const NOTICE: { min: number; label: string }[] = [
  { min: 0, label: 'ללא' },
  { min: 30, label: 'חצי שעה' },
  { min: 60, label: 'שעה' },
  { min: 120, label: 'שעתיים' },
  { min: 240, label: '4 שעות' },
  { min: 1440, label: 'יום' },
];
const AHEAD = [7, 14, 30, 60, 90];

function BookingSettings() {
  const business = useBusiness();
  const { refreshBusiness } = useAuth();
  const [interval, setSlotInterval] = useState(business.slot_interval_min);
  const [notice, setNotice] = useState(business.min_notice_min);
  const [ahead, setAhead] = useState(business.max_days_ahead);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    const { error: err } = await supabase
      .from('businesses')
      .update({ slot_interval_min: interval, min_notice_min: notice, max_days_ahead: ahead })
      .eq('id', business.id);
    if (err) {
      setBusy(false);
      return setError(errorMessage(err));
    }
    await refreshBusiness();
    setBusy(false);
    goBackOr('/settings');
  }

  return (
    <Screen footer={<Button title="שמירה" onPress={save} loading={busy} />}>
      <Setting title="מרווח בין שעות" subtitle="כל כמה דקות מוצעת שעת התחלה (למשל 9:00, 9:15, 9:30)">
        {INTERVALS.map((v) => (
          <Chip key={v} label={`${v} דק׳`} selected={interval === v} onPress={() => setSlotInterval(v)} />
        ))}
      </Setting>
      <Setting title="זמן מינימלי מראש" subtitle="כמה זמן לפני התור לקוחות יכולים עוד לקבוע אותו">
        {NOTICE.map((v) => (
          <Chip key={v.min} label={v.label} selected={notice === v.min} onPress={() => setNotice(v.min)} />
        ))}
      </Setting>
      <Setting title="כמה ימים קדימה" subtitle="עד כמה רחוק ביומן לקוחות יכולים לקבוע">
        {AHEAD.map((v) => (
          <Chip key={v} label={`${v} ימים`} selected={ahead === v} onPress={() => setAhead(v)} />
        ))}
      </Setting>
      <ErrorBox message={error} />
    </Screen>
  );
}

function Setting({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt bold>{title}</Txt>
      <Txt variant="small" muted>
        {subtitle}
      </Txt>
      <Row style={{ flexWrap: 'wrap' }}>{children}</Row>
    </View>
  );
}

export default withOwner(BookingSettings);
