import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Row, Screen, Txt, type IconName } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, radius, spacing } from '@/theme';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar-outline', title: 'יומן חכם', text: 'כל התורים שלך במקום אחד, לפי יום ושעה.' },
  { icon: 'link-outline', title: 'קישור לקביעת תורים', text: 'הלקוחות קובעים לבד, 24/7, בלי טלפונים.' },
  { icon: 'people-outline', title: 'ניהול לקוחות', text: 'היסטוריית תורים והערות לכל לקוח.' },
];

export default function Welcome() {
  const { session } = useAuth();
  if (session) return <Redirect href="/" />;

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button title="פתיחת חשבון לעסק" onPress={() => router.push('/signup')} />
          <Button title="כבר יש לי חשבון" variant="ghost" onPress={() => router.push('/login')} />
        </>
      }>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="sparkles" size={36} color={colors.textOnPrimary} />
        </View>
        <Txt variant="h1" center>
          תורים בקליק
        </Txt>
        <Txt muted center>
          ניהול תורים פשוט למספרות, קוסמטיקאיות, מעצבות גבות ומטפלות.
        </Txt>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <Row key={f.title} gap={spacing.md} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Txt bold>{f.title}</Txt>
              <Txt variant="small" muted>
                {f.text}
              </Txt>
            </View>
          </Row>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl * 1.5, paddingBottom: spacing.lg },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radius.lg + 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  features: { gap: spacing.lg },
  feature: { alignItems: 'flex-start' },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
