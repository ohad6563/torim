import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, Row, Txt } from '@/components/ui';
import { getPushStatus, registerForPush, type PushStatus } from '@/lib/push';
import { colors, radius, spacing } from '@/theme';

/**
 * Invites the customer to turn on reminders (a day and two hours before), and
 * shows the current state. Hidden on the web, where the app can't send them.
 */
export function RemindersCard({ compact }: { compact?: boolean }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus);
  }, []);

  if (!status || status === 'unsupported') return null;
  if (status === 'granted' && compact) return null;

  return (
    <Card style={styles.card}>
      <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
        <View style={styles.icon}>
          <Ionicons name={status === 'granted' ? 'notifications' : 'notifications-outline'} size={20} color={colors.text} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold>{status === 'granted' ? 'תזכורות פעילות' : 'רוצה תזכורת לפני התור?'}</Txt>
          <Txt variant="small" muted>
            {status === 'granted'
              ? 'נשלח אליך התראה כשהתור נקבע, יום לפני ושעתיים לפני.'
              : 'התראה בטלפון יום לפני ושעתיים לפני – כדי שלא תפספס/י.'}
          </Txt>
        </View>
      </Row>
      {status === 'undetermined' ? (
        <Button
          small
          title="הפעלת תזכורות"
          icon="notifications-outline"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            setStatus(await registerForPush({ ask: true }));
            setBusy(false);
          }}
        />
      ) : status === 'denied' ? (
        <Button small variant="secondary" title="פתיחת הגדרות הטלפון" onPress={() => Linking.openSettings()} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
