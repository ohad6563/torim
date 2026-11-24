import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, PressableScale, Row, Txt } from '@/components/ui';
import { confirm } from '@/lib/dialogs';
import { formatDayLong } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { leaveWaitlist, partLabel, type MyWaitlistEntry } from '@/lib/waitlist';
import { colors, radius, spacing } from '@/theme';

/** One of the customer's waitlist entries in "התורים שלי". Tapping opens booking on that day. */
export function WaitlistRow({ entry, slug, onChanged }: { entry: MyWaitlistEntry; slug: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (!(await confirm('לצאת מרשימת ההמתנה?', `${entry.service_name} · ${formatDayLong(entry.day)}`, { confirmText: 'יציאה' })))
      return;
    setBusy(true);
    try {
      await leaveWaitlist(entry.id);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <PressableScale
        accessibilityLabel={`רשימת המתנה: ${entry.service_name}, ${formatDayLong(entry.day)}. לבדיקת שעות פנויות`}
        onPress={() =>
          router.push({
            pathname: '/book/[slug]',
            params: entry.service_id ? { slug, service: entry.service_id, day: entry.day } : { slug },
          })
        }
        style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="hourglass-outline" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold>{entry.service_name}</Txt>
          <Txt variant="small" muted>
            {formatDayLong(entry.day)} · {partLabel(entry.part)}
          </Txt>
        </View>
        <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
      </PressableScale>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="tiny" muted style={{ flex: 1 }}>
          {error ?? 'נעדכן אותך כשיתפנה תור'}
        </Txt>
        <Button title="יציאה" variant="ghost" onPress={leave} loading={busy} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
