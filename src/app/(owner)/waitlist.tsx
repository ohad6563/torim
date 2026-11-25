import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Appear, Button, Card, EmptyState, ErrorBox, IconButton, Loading, Row, Screen, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useFocusData } from '@/hooks/use-focus-data';
import { formatDayLong, formatPhone, todayIn } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { whatsappUrl } from '@/lib/links';
import { fetchStudioWaitlist, partLabel, setWaitlistStatus, type StudioWaitlistEntry } from '@/lib/waitlist';
import { colors, radius, spacing } from '@/theme';

/**
 * Customers waiting for a time, grouped by day. When a time frees up they get a
 * push automatically; here the studio can call, offer another time, or mark it handled.
 */
export default function Waitlist() {
  const business = useBusiness();
  const today = todayIn(business.timezone);
  const { data, loading, refreshing, error, refresh, reload } = useFocusData(fetchStudioWaitlist, [business.id]);
  const entries = data ?? [];
  const days = [...new Set(entries.map((e) => e.day))];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Txt muted>
        לקוחות שמחכות לתור. כשמתפנה תור הן מקבלות התראה אוטומטית, ומי שקובעת יורדת מהרשימה. אפשר גם להתקשר ולהציע מועד אחר.
      </Txt>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <EmptyState icon="hourglass-outline" title="אין כרגע ממתינות" message="כשלקוחה תיכנס לרשימת ההמתנה היא תופיע כאן, ותקבלו התראה." />
      ) : (
        days.map((d) => (
          <View key={d} style={{ gap: spacing.sm }}>
            <Txt label variant="tiny">
              {d === today ? 'היום · ' : ''}
              {formatDayLong(d)}
            </Txt>
            {entries
              .filter((e) => e.day === d)
              .map((e, i) => (
                <Appear key={e.id} index={i}>
                  <EntryCard entry={e} businessName={business.name} onDone={reload} />
                </Appear>
              ))}
          </View>
        ))
      )}
    </Screen>
  );
}

function EntryCard({ entry, businessName, onDone }: { entry: StudioWaitlistEntry; businessName: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = entry.customer_phone;

  async function handled() {
    setBusy(true);
    try {
      await setWaitlistStatus(entry.id, 'handled');
      haptics.success();
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      <Row>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold>{entry.customer_name || 'לקוחה'}</Txt>
          <Txt variant="small" muted>
            {entry.service_name} · {partLabel(entry.part)}
            {phone ? ` · ⁦${formatPhone(phone)}⁩` : ''}
          </Txt>
        </View>
        {phone ? (
          <Row gap={spacing.sm}>
            <IconButton icon="call-outline" label={`התקשרות ל${entry.customer_name ?? 'לקוחה'}`} onPress={() => Linking.openURL(`tel:${phone}`)} />
            <IconButton
              icon="logo-whatsapp"
              label={`וואטסאפ ל${entry.customer_name ?? 'לקוחה'}`}
              onPress={() =>
                Linking.openURL(
                  whatsappUrl(phone, `היי${entry.customer_name ? ` ${entry.customer_name.split(' ')[0]}` : ''}, כאן ${businessName}. לגבי רשימת ההמתנה ל${formatDayLong(entry.day)} – `),
                )
              }
            />
          </Row>
        ) : null}
      </Row>
      {entry.note ? (
        <View style={styles.note}>
          <Txt variant="small">״{entry.note}״</Txt>
        </View>
      ) : null}
      <Txt variant="tiny" muted>
        {entry.last_notified_at ? 'קיבלה התראה על תור שהתפנה · ' : ''}
        נכנסה לרשימה {new Date(entry.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
      </Txt>
      <ErrorBox message={error} />
      <Row gap={spacing.sm}>
        <Button
          title="קביעת תור"
          small
          variant="secondary"
          icon="add"
          onPress={() => router.push({ pathname: '/appointment/new', params: { day: entry.day } })}
        />
        <Button title="טופל" small variant="ghost" icon="checkmark" onPress={handled} loading={busy} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  note: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm },
});
