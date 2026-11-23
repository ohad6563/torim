import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

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
        <Pressable key={l.label} onPress={() => router.push(l.href)} accessibilityRole="link" style={{ paddingVertical: spacing.sm }}>
          <Txt muted center style={{ textDecorationLine: 'underline' }}>
            {l.label}
          </Txt>
        </Pressable>
      ))}
    </Screen>
  );
}
