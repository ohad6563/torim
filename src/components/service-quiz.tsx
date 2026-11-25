import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button, Card, PressableScale, Row, Txt } from '@/components/ui';
import { formatDuration, formatPrice } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import type { Service } from '@/lib/types';
import { colors, motion, radius, spacing } from '@/theme';

/**
 * "What suits me?" — two quick questions that point the customer at a treatment.
 * Results are matched to the studio's live services by keyword, so renaming or
 * removing a service never breaks it (an unmatched result simply isn't offered).
 */
type Goal = 'shape' | 'fuller' | 'lashes';
type Length = 'weeks' | 'long';

const GOALS: { key: Goal; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'shape', title: 'גבות מסודרות ונקיות', icon: 'sparkles-outline' },
  { key: 'fuller', title: 'גבות מלאות וכהות יותר', icon: 'color-palette-outline' },
  { key: 'lashes', title: 'מבט פתוח בעיניים', icon: 'eye-outline' },
];
const LENGTHS: { key: Length; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'weeks', title: 'כמה שבועות זה מספיק', icon: 'time-outline' },
  { key: 'long', title: 'הכי הרבה זמן, שנה ומעלה', icon: 'infinite-outline' },
];

const RESULTS: Record<string, { match: string; why: string }> = {
  shape: { match: 'עיצוב', why: 'סידור וניקוי לפי מבנה הפנים שלך. מהיר, עדין ומרענן את כל המראה.' },
  'fuller-weeks': { match: 'צביעת', why: 'צבע שממלא רווחים ומחדד את הקו, בלי התחייבות. מחזיק כמה שבועות.' },
  'fuller-long': { match: 'מיקרו', why: 'שערות עדינות בעבודת יד שנראות טבעיות לגמרי. מחזיק שנה ויותר.' },
  lashes: { match: 'ריסים', why: 'ריסים מורמים ומודגשים בלי מסקרה ובלי תוספות. מחזיק כ־6 שבועות.' },
};

export function ServiceQuiz({ services, onBook }: { services: Service[]; onBook: (serviceId: string) => void }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [length, setLength] = useState<Length | null>(null);

  const resultKey = goal === 'fuller' ? (length ? `fuller-${length}` : null) : goal;
  const result = resultKey ? RESULTS[resultKey] : null;
  const service = result ? services.find((s) => s.name.includes(result.match)) : undefined;
  // Hide answers that lead to a treatment the studio doesn't offer right now.
  const offers = (key: string) => services.some((s) => s.name.includes(RESULTS[key].match));
  const goals = GOALS.filter((g) => (g.key === 'fuller' ? offers('fuller-weeks') || offers('fuller-long') : offers(g.key)));
  const lengths = LENGTHS.filter((l) => offers(`fuller-${l.key}`));
  if (goals.length < 2) return null;

  const step = !goal ? 0 : goal === 'fuller' && !length ? 1 : 2;
  const reset = () => {
    setGoal(null);
    setLength(null);
  };
  const pickGoal = (g: Goal) => {
    haptics.select();
    setGoal(g);
    // Only one length on offer: no need to ask.
    if (g === 'fuller' && lengths.length === 1) setLength(lengths[0].key);
  };

  return (
    <Card style={styles.card}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h3">{step === 2 ? 'ההמלצה שלנו' : 'מה מתאים לי?'}</Txt>
        <Row gap={6}>
          {[0, 1, 2].map((i) => (
            <Animated.View key={i} layout={LinearTransition.springify()} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </Row>
      </Row>

      <Animated.View key={step} entering={FadeInDown.duration(motion.base).easing(Easing.bezier(...motion.curve))} exiting={FadeOut.duration(motion.fast)} style={styles.body}>
        {step === 0 ? (
          <>
            <Txt muted>מה הכי חשוב לך?</Txt>
            {goals.map((g) => (
              <Option key={g.key} title={g.title} icon={g.icon} onPress={() => pickGoal(g.key)} />
            ))}
          </>
        ) : step === 1 ? (
          <>
            <Txt muted>כמה זמן שהתוצאה תחזיק?</Txt>
            {lengths.map((l) => (
              <Option
                key={l.key}
                title={l.title}
                icon={l.icon}
                onPress={() => {
                  haptics.select();
                  setLength(l.key);
                }}
              />
            ))}
          </>
        ) : service && result ? (
          <>
            <View style={styles.result}>
              <Txt variant="h2">{service.name}</Txt>
              <Txt variant="small" muted>
                {formatDuration(service.duration_min)}
                {service.price !== null ? ` · ${formatPrice(service.price)}` : ''}
              </Txt>
              <Txt style={{ marginTop: spacing.sm }}>{result.why}</Txt>
            </View>
            <Button title="קביעת תור לטיפול הזה" icon="calendar-outline" onPress={() => onBook(service.id)} />
            <Txt variant="tiny" faint center>
              ההתאמה הסופית נעשית יחד בסטודיו.
            </Txt>
          </>
        ) : null}
      </Animated.View>

      {step > 0 ? (
        <Button title="מההתחלה" variant="ghost" icon="refresh-outline" onPress={reset} />
      ) : null}
    </Card>
  );
}

function Option({ title, icon, onPress }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={title} style={styles.option}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <Txt style={{ flex: 1 }}>{title}</Txt>
      <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  body: { gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotOn: { width: 18, backgroundColor: colors.primary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result: { gap: 2, paddingVertical: spacing.sm },
});
