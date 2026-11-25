import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Button, Chip, ErrorBox, Field, Row, Txt } from '@/components/ui';
import { formatDayLong } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { pushSupported, registerForPush } from '@/lib/push';
import { DAY_PARTS, joinWaitlist, leaveWaitlist, partLabel, type DayPart, type MyWaitlistEntry } from '@/lib/waitlist';
import { colors, motion, radius, spacing } from '@/theme';

/**
 * Under the time wheel in the booking flow: join the waitlist for the chosen day
 * when it's full (prominent) or when no free time suits (a quiet link).
 * When a time frees up the server sends a push, and the studio sees the request.
 */
export function WaitlistCard({
  businessId,
  serviceId,
  day,
  full,
  entry,
  onChanged,
}: {
  businessId: string;
  serviceId: string;
  day: string;
  /** No free times at all that day. */
  full: boolean;
  /** The customer's active entry for this day and treatment, if any. */
  entry: MyWaitlistEntry | undefined;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState<DayPart>('any');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await joinWaitlist({ businessId, serviceId, day, part, note: note.trim() || undefined });
      haptics.success();
      setOpen(false);
      setNote('');
      onChanged();
      // The whole point is the push when a time frees up, so ask for permission now.
      if (pushSupported) registerForPush({ ask: true }).catch(() => {});
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      await leaveWaitlist(entry.id);
      haptics.select();
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (entry) {
    return (
      <Animated.View key="on" entering={FadeIn.duration(motion.base)} style={[styles.card, styles.onList]}>
        <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold>את ברשימת ההמתנה</Txt>
            <Txt variant="small" muted>
              {formatDayLong(entry.day)} · {partLabel(entry.part)}
            </Txt>
            <Txt variant="small" style={{ marginTop: spacing.xs }}>
              {pushSupported
                ? 'ברגע שיתפנה תור נשלח לך התראה. גם הסטודיו רואה שאת מחכה וינסה למצוא לך מקום.'
                : 'הסטודיו רואה שאת מחכה וינסה למצוא לך מקום. באפליקציה בטלפון תקבלי גם התראה כשיתפנה תור.'}
            </Txt>
          </View>
        </Row>
        <ErrorBox message={error} />
        <Button title="יציאה מהרשימה" variant="ghost" onPress={leave} loading={busy} />
      </Animated.View>
    );
  }

  if (!open) {
    if (full) {
      return (
        <Animated.View key="full" entering={FadeIn.duration(motion.base)} style={styles.card}>
          <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
            <View style={styles.icon}>
              <Ionicons name="hourglass-outline" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {/* Full, or closed for time off: either way a time may open up later. */}
              <Txt bold>אין תורים פנויים ביום הזה</Txt>
              <Txt variant="small" muted>
                אפשר להיכנס לרשימת המתנה. אם יתפנה תור או שהסטודיו ייפתח ביום הזה, נעדכן אותך מיד.
              </Txt>
            </View>
          </Row>
          <Button title="הצטרפות לרשימת ההמתנה" icon="notifications-outline" variant="secondary" onPress={() => setOpen(true)} />
        </Animated.View>
      );
    }
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.link} hitSlop={6}>
        <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} />
        <Txt variant="small" muted>
          לא מצאת שעה שמתאימה?{' '}
          <Txt variant="small" style={{ textDecorationLine: 'underline' }}>
            רשימת המתנה
          </Txt>
        </Txt>
      </Pressable>
    );
  }

  return (
    <Animated.View key="form" entering={FadeInDown.duration(motion.base).easing(Easing.bezier(...motion.curve))} exiting={FadeOut.duration(motion.fast)} style={styles.card}>
      <View style={{ gap: 2 }}>
        <Txt bold>רשימת המתנה · {formatDayLong(day)}</Txt>
        <Txt variant="small" muted>
          באיזה חלק של היום נוח לך?
        </Txt>
      </View>
      <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
        {DAY_PARTS.map((p) => (
          <Chip key={p.key} label={p.label} selected={part === p.key} onPress={() => setPart(p.key)} />
        ))}
      </Row>
      <Field label="הערה לסטודיו (לא חובה)" value={note} onChangeText={setNote} maxLength={300} placeholder="למשל: גמישה אחרי 16:00" />
      <ErrorBox message={error} />
      <Button title="הצטרפות" icon="checkmark" onPress={join} loading={busy} />
      <Button title="ביטול" variant="ghost" onPress={() => setOpen(false)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  onList: { borderColor: colors.borderStrong },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
});
