import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrowMark } from '@/components/brow-mark';
import { Txt } from '@/components/ui';
import { spacing } from '@/theme';

export const STUDIO_NAME = process.env.EXPO_PUBLIC_STUDIO_NAME || 'הגבות של הילה';

/** Brand header of the sign-in and sign-up screens. */
export function AuthHero({ subtitle, compact }: { subtitle: string; compact?: boolean }) {
  return (
    <View style={[styles.hero, compact && styles.compact]}>
      <BrowMark width={compact ? 84 : 116} />
      <Animated.View entering={FadeInDown.delay(400).duration(700)}>
        <Txt variant={compact ? 'h1' : 'display'} weight="light" center>
          {STUDIO_NAME}
        </Txt>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(600).duration(700)}>
        <Txt muted center>
          {subtitle}
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl, paddingBottom: spacing.lg },
  compact: { paddingTop: spacing.xl, paddingBottom: spacing.sm, gap: spacing.sm },
});
