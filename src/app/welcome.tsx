import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrowMark } from '@/components/brow-mark';
import { Appear, Button, Row, Screen, Txt, type IconName } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, radius, spacing } from '@/theme';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar-outline', title: 'יומן חכם', text: 'כל התורים במקום אחד, לפי יום ושעה.' },
  { icon: 'link-outline', title: 'קביעת תורים 24/7', text: 'הלקוחות קובעים לבד, בלי טלפונים והודעות.' },
  { icon: 'people-outline', title: 'כרטיס לקוח', text: 'היסטוריית טיפולים והערות לכל לקוחה.' },
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
        <BrowMark width={200} />
        <Animated.View entering={FadeInDown.delay(500).duration(800)}>
          <Txt variant="display" center>
            תורים בקליק
          </Txt>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(700).duration(800)}>
          <Txt muted center>
            ניהול תורים אלגנטי לסטודיו שלך
          </Txt>
        </Animated.View>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <Appear key={f.title} index={i} delay={900}>
            <Row gap={spacing.md} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt bold>{f.title}</Txt>
                <Txt variant="small" muted>
                  {f.text}
                </Txt>
              </View>
            </Row>
          </Appear>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl, paddingBottom: spacing.xl },
  features: { gap: spacing.lg },
  feature: { alignItems: 'flex-start' },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
