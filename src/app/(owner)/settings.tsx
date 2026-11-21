import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Row, Screen, Txt, type IconName } from '@/components/ui';
import { useAuth, useBusiness } from '@/context/auth';
import { confirm, showMessage } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { bookingUrl, shareLink } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

const ITEMS: { icon: IconName; title: string; subtitle: string; href: Href }[] = [
  { icon: 'storefront-outline', title: 'פרטי העסק', subtitle: 'שם, טלפון, כתובת ותיאור', href: '/settings/profile' },
  { icon: 'time-outline', title: 'שעות פעילות', subtitle: 'מתי אפשר לקבוע תורים', href: '/settings/hours' },
  { icon: 'airplane-outline', title: 'חופשות וחסימות', subtitle: 'ימי חופש, הפסקות ואירועים', href: '/settings/time-off' },
  { icon: 'options-outline', title: 'הגדרות הזמנה', subtitle: 'מרווחי זמן, התראה מראש וטווח קביעה', href: '/settings/booking' },
];

export default function Settings() {
  const business = useBusiness();
  const { session, profile, signOut } = useAuth();

  async function share() {
    const copied = await shareLink(bookingUrl(business.slug), `לקביעת תור ב${business.name}:`);
    if (copied) showMessage('הקישור הועתק', bookingUrl(business.slug));
  }

  async function logout() {
    if (await confirm('התנתקות', 'להתנתק מהחשבון?', { confirmText: 'התנתקות' })) {
      await signOut();
      router.replace('/login');
    }
  }

  async function deleteAccount() {
    const ok = await confirm(
      'מחיקת החשבון',
      business.owner_id === session?.user.id
        ? 'זה החשבון של בעלת העסק: העסק, הלקוחות וכל התורים יימחקו לצמיתות. אי אפשר לשחזר אותם.'
        : 'החשבון שלך יימחק. העסק ונתוניו יישארו כמו שהם.',
      { confirmText: 'מחיקה לצמיתות', destructive: true },
    );
    if (!ok) return;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return showMessage('המחיקה נכשלה', errorMessage(error));
    await signOut();
    router.replace('/login');
  }

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
        <Txt bold>קישור לקביעת תורים</Txt>
        <Txt variant="small" muted style={styles.ltr}>
          {bookingUrl(business.slug)}
        </Txt>
        <Row>
          <Button small icon="share-social-outline" title="שיתוף" onPress={share} />
          <Button
            small
            variant="secondary"
            icon="eye-outline"
            title="תצוגה מקדימה"
            onPress={() => router.push('/studio')}
          />
        </Row>
      </Card>

      <Card style={{ paddingVertical: spacing.xs }}>
        {ITEMS.map((item, i) => (
          <View key={item.title}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
              accessibilityRole="button">
              <Ionicons name={item.icon} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Txt bold>{item.title}</Txt>
                <Txt variant="small" muted>
                  {item.subtitle}
                </Txt>
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Txt variant="small" muted center>
        מחובר/ת כ־{profile?.username ?? session?.user.email}
      </Txt>
      <Button title="התנתקות" variant="secondary" icon="log-out-outline" onPress={logout} />
      <Button title="מחיקת החשבון" variant="ghost" onPress={deleteAccount} style={{ opacity: 0.8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  ltr: { writingDirection: 'ltr' },
});
