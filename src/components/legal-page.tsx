import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Appear, Screen, Txt } from '@/components/ui';
import { LEGAL_UPDATED } from '@/lib/studio';
import { spacing } from '@/theme';

export type LegalSection = { title: string; body: string };

/** Shared layout for the public legal pages (terms, accessibility, support). */
export function LegalPage({
  intro,
  sections,
  links = [],
}: {
  intro?: string;
  sections: LegalSection[];
  links?: { label: string; href: Href }[];
}) {
  return (
    <Screen>
      <Txt variant="small" muted>
        עודכן לאחרונה: {LEGAL_UPDATED}
      </Txt>
      {intro ? <Txt>{intro}</Txt> : null}
      {sections.map((s, i) => (
        <Appear key={s.title} index={i}>
          <View style={{ gap: spacing.xs }} accessible accessibilityRole="summary">
            <Txt variant="h3" accessibilityRole="header">
              {s.title}
            </Txt>
            <Txt muted>{s.body}</Txt>
          </View>
        </Appear>
      ))}
      {links.map((l) => (
        <Pressable key={l.label} onPress={() => router.push(l.href)} accessibilityRole="link" style={styles.link}>
          <Txt muted center style={{ textDecorationLine: 'underline' }}>
            {l.label}
          </Txt>
        </Pressable>
      ))}
    </Screen>
  );
}

const LINKS: { label: string; href: Href }[] = [
  { label: 'תנאי שימוש', href: '/terms' },
  { label: 'פרטיות', href: '/privacy' },
  { label: 'נגישות', href: '/accessibility' },
  { label: 'תמיכה', href: '/support' },
];

/** Row of links to the public legal pages, each a full 44pt tap target. Used on profile and settings. */
export function LegalLinks() {
  return (
    <View style={styles.row}>
      {LINKS.map((l) => (
        <Pressable key={l.label} onPress={() => router.push(l.href)} accessibilityRole="link" style={styles.chip} hitSlop={4}>
          <Txt variant="small" muted>
            {l.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: spacing.sm },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
});
