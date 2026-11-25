import { StyleSheet, View } from 'react-native';

import { Card, Row, Txt } from '@/components/ui';
import { timeOf } from '@/lib/dates';
import type { Appointment, AppointmentStatus } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: 'נקבע',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע/ה',
};

const STATUS_COLOR: Record<AppointmentStatus, { bg: string; fg: string }> = {
  booked: { bg: colors.primarySoft, fg: colors.primary },
  completed: { bg: colors.successSoft, fg: colors.success },
  cancelled: { bg: colors.dangerSoft, fg: colors.danger },
  no_show: { bg: colors.warningSoft, fg: '#A86A12' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Txt variant="tiny" bold color={c.fg}>
        {STATUS_LABEL[status]}
      </Txt>
    </View>
  );
}

export function AppointmentCard({
  appt,
  tz,
  onPress,
  showCustomer = true,
  showDate,
}: {
  appt: Appointment;
  tz: string;
  onPress?: () => void;
  showCustomer?: boolean;
  showDate?: string;
}) {
  const inactive = appt.status === 'cancelled' || appt.status === 'no_show';
  return (
    <Card onPress={onPress} style={[styles.card, inactive && styles.inactive]}>
      <Row gap={spacing.md} style={{ alignItems: 'stretch' }}>
        <View style={styles.time}>
          <Txt bold color={colors.primary}>
            {timeOf(appt.starts_at, tz)}
          </Txt>
          <Txt variant="tiny" muted>
            {timeOf(appt.ends_at, tz)}
          </Txt>
        </View>
        <View style={styles.bar} />
        <View style={styles.body}>
          {showDate ? (
            <Txt variant="tiny" muted>
              {showDate}
            </Txt>
          ) : null}
          <Txt bold numberOfLines={1} style={inactive && styles.strike}>
            {showCustomer ? appt.customer_name : appt.service_name}
          </Txt>
          <Txt variant="small" muted numberOfLines={1}>
            {showCustomer ? appt.service_name : null}
            {appt.notes ? `${showCustomer ? ' · ' : ''}${appt.notes}` : ''}
          </Txt>
        </View>
        {appt.status !== 'booked' ? (
          <StatusBadge status={appt.status} />
        ) : appt.confirmed_at ? (
          <View style={[styles.badge, { backgroundColor: colors.successSoft }]} accessibilityLabel="הלקוחה אישרה הגעה">
            <Txt variant="tiny" bold color={colors.success}>
              אישרה ✓
            </Txt>
          </View>
        ) : null}
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.md },
  // Past/cancelled: a quieter background instead of fading the text (keeps 4.5:1 contrast).
  inactive: { backgroundColor: colors.surfaceRaised },
  time: { width: 52, alignItems: 'center', justifyContent: 'center' },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.35 },
  body: { flex: 1, justifyContent: 'center', gap: 2 },
  strike: { textDecorationLine: 'line-through' },
  badge: { alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
});
