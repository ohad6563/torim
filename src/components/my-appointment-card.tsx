import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/appointment-card';
import { Card, Row, Txt } from '@/components/ui';
import { dayNumber, dayOf, formatDayLong, monthName, timeOf } from '@/lib/dates';
import type { MyAppointment } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';

/** A customer's appointment: a calendar-page date block, the treatment and the time. */
export function MyAppointmentCard({ appt, dim }: { appt: MyAppointment; dim?: boolean }) {
  const day = dayOf(appt.starts_at, appt.timezone);
  return (
    <Card
      onPress={() => router.push({ pathname: '/a/[token]', params: { token: appt.cancel_token } })}
      accessibilityLabel={`${appt.service_name}, ${formatDayLong(day)} בשעה ${timeOf(appt.starts_at, appt.timezone)}`}
      style={dim && { opacity: 0.6 }}>
      <Row gap={spacing.md}>
        <View style={[styles.date, dim && styles.dateDim]}>
          <Txt variant="h2" color={dim ? colors.text : colors.textOnPrimary} style={styles.dateNum}>
            {dayNumber(day)}
          </Txt>
          <Txt variant="tiny" color={dim ? colors.textMuted : colors.textOnPrimary}>
            {monthName(day)}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold>{appt.service_name}</Txt>
          <Txt variant="small" muted>
            {formatDayLong(day)} · {timeOf(appt.starts_at, appt.timezone)}
          </Txt>
        </View>
        {appt.status !== 'booked' ? <StatusBadge status={appt.status} /> : null}
        <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  date: {
    width: 58,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  dateDim: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  dateNum: { lineHeight: 28 },
});
