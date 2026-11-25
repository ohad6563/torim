import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { BrowMark } from '@/components/brow-mark';
import { Txt } from '@/components/ui';
import { motion, spacing } from '@/theme';

export const STUDIO_NAME = process.env.EXPO_PUBLIC_STUDIO_NAME || 'הגבות של הילה';

/** Brand header of the sign-in and sign-up screens. */
export function AuthHero({ subtitle, compact, onDark }: { subtitle: string; compact?: boolean; onDark?: boolean }) {
  return (
    <View style={[styles.hero, compact && styles.compact]}>
      <BrowMark width={compact ? 84 : 116} color={onDark ? '#FFFFFF' : undefined} />
      <Animated.View entering={FadeInDown.delay(120).duration(motion.slow).easing(Easing.bezier(...motion.curve))}>
        <Txt variant={compact ? 'h1' : 'display'} weight="light" center color={onDark ? '#FFFFFF' : undefined}>
          {STUDIO_NAME}
        </Txt>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).duration(motion.slow).easing(Easing.bezier(...motion.curve))}>
        <Txt muted={!onDark} center color={onDark ? 'rgba(255,255,255,0.78)' : undefined}>
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
