import { router } from 'expo-router';

import { MyAppointmentCard } from '@/components/my-appointment-card';
import { Appear, Button, EmptyState, ErrorBox, Screen, Skeleton, Txt } from '@/components/ui';
import { useMyAppointments } from '@/hooks/use-my-appointments';
import { useMyWaitlist } from '@/hooks/use-my-waitlist';
import { WaitlistRow } from '@/components/waitlist-row';

const BUSINESS_SLUG = process.env.EXPO_PUBLIC_BUSINESS_SLUG || 'hila-brows';

export default function MyAppointments() {
  const { upcoming, past, loading, refreshing, refresh, error } = useMyAppointments();
  const waitlist = useMyWaitlist();

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        refresh();
        waitlist.reload();
      }}>
      <ErrorBox message={error} />
      {loading ? (
        <>
          <Skeleton height={84} />
          <Skeleton height={84} />
        </>
      ) : error ? (
        <Button title="נסו שוב" variant="secondary" onPress={refresh} />
      ) : upcoming.length === 0 && past.length === 0 && waitlist.entries.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title="עוד אין תורים"
          message="תורים שתקבעו יופיעו כאן, עם אפשרות לצפות בפרטים או לבטל."
          action={
            <Button
              title="קביעת תור"
              icon="add"
              onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: BUSINESS_SLUG } })}
            />
          }
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <Txt label variant="tiny">
              קרובים
            </Txt>
          ) : null}
          {upcoming.map((a, i) => (
            <Appear key={a.id} index={i}>
              <MyAppointmentCard appt={a} />
            </Appear>
          ))}
          {waitlist.entries.length > 0 ? (
            <Txt label variant="tiny">
              רשימת המתנה
            </Txt>
          ) : null}
          {waitlist.entries.map((w, i) => (
            <Appear key={w.id} index={upcoming.length + i}>
              <WaitlistRow entry={w} slug={BUSINESS_SLUG} onChanged={waitlist.reload} />
            </Appear>
          ))}
          {past.length > 0 ? (
            <Txt label variant="tiny">
              היסטוריה
            </Txt>
          ) : null}
          {past.map((a, i) => (
            <Appear key={a.id} index={upcoming.length + i}>
              <MyAppointmentCard appt={a} dim />
            </Appear>
          ))}
        </>
      )}
    </Screen>
  );
}
