import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { colors, family, font, MAX_WIDTH, radius, spacing, springs } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Shared "press" feel: a quick spring scale-down, so every tap feels physical. */
function usePressScale(to = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => {
      scale.set(withSpring(to, springs.press));
    },
    onPressOut: () => {
      scale.set(withSpring(1, springs.press));
    },
  };
}

// ---------- Motion helpers ----------

/** Fades and lifts its children in. Pass `index` to stagger items in a list. */
export function Appear({
  children,
  index = 0,
  delay = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(520)
        .delay(delay + Math.min(index, 12) * 55)
        .easing(Easing.out(Easing.cubic))}
      style={style}>
      {children}
    </Animated.View>
  );
}

// ---------- Layout ----------

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  wide?: boolean;
};

/** Page wrapper: safe area, keyboard handling, centred max-width column. */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ['bottom'],
  footer,
  contentStyle,
  wide,
}: ScreenProps) {
  const inner = <View style={[styles.column, wide && { maxWidth: 1080 }, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            indicatorStyle={colors.isDark ? 'white' : 'black'}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.text} />
              ) : undefined
            }>
            {inner}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scrollContent]}>{inner}</View>
        )}
        {footer ? (
          <View style={styles.footer}>
            <View style={styles.footerInner}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Row({
  children,
  style,
  gap = spacing.sm,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const press = usePressScale(0.98);
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[styles.card, style, press.style]}>
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Text ----------

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
type Weight = keyof typeof family;

const VARIANT_WEIGHT: Record<Variant, Weight> = {
  display: 'light',
  h1: 'bold',
  h2: 'semibold',
  h3: 'semibold',
  body: 'regular',
  small: 'regular',
  tiny: 'medium',
};

type TxtProps = {
  children: ReactNode;
  variant?: Variant;
  muted?: boolean;
  faint?: boolean;
  bold?: boolean;
  weight?: Weight;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Small caps-like label: tracked out, muted. */
  label?: boolean;
};

export function Txt({
  children,
  variant = 'body',
  muted,
  faint,
  bold,
  weight,
  color,
  center,
  style,
  numberOfLines,
  label,
}: TxtProps) {
  const size = font[variant];
  const w = weight ?? (bold ? 'semibold' : VARIANT_WEIGHT[variant]);
  return (
    <Text
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={variant === 'display' ? 1.2 : 1.6}
      style={[
        styles.text,
        {
          fontSize: size,
          lineHeight: Math.round(size * (variant === 'display' ? 1.08 : 1.42)),
          fontFamily: family[w],
        },
        variant === 'display' && { letterSpacing: -0.5 },
        label && styles.label,
        muted && { color: colors.textMuted },
        faint && { color: colors.textFaint },
        color ? { color } : null,
        center && { textAlign: 'center' },
        style,
      ]}>
      {children}
    </Text>
  );
}

// ---------- Buttons ----------

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  small,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const press = usePressScale(0.96);
  const palette = {
    primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
    secondary: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.dangerSoft },
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <AnimatedPressable
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border },
        isDisabled && styles.disabled,
        style,
        press.style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Row gap={spacing.sm} style={{ justifyContent: 'center' }}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={palette.fg} /> : null}
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.buttonText, small && { fontSize: font.small }, { color: palette.fg }]}>
            {title}
          </Text>
        </Row>
      )}
    </AnimatedPressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.text,
  label,
  size = 22,
  filled,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  label: string;
  size?: number;
  filled?: boolean;
}) {
  const press = usePressScale(0.88);
  return (
    <AnimatedPressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconButton, filled && styles.iconButtonFilled, press.style]}>
      <Ionicons name={icon} size={size} color={color} />
    </AnimatedPressable>
  );
}

// ---------- Inputs ----------

type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string };

/** Text field whose border lights up on focus. */
export function Field({ label, error, hint, style, onFocus, onBlur, ...props }: FieldProps) {
  const focus = useSharedValue(0);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error ? colors.danger : interpolateColor(focus.value, [0, 1], [colors.border, colors.text]),
  }));
  return (
    <View style={styles.field}>
      <Txt variant="small" muted weight="medium">
        {label}
      </Txt>
      <Animated.View style={[styles.inputWrap, props.multiline && styles.inputMultiline, borderStyle]}>
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.text}
          cursorColor={colors.text}
          keyboardAppearance={colors.isDark ? 'dark' : 'light'}
          maxFontSizeMultiplier={1.6}
          onFocus={(e) => {
            focus.set(withTiming(1, { duration: 180 }));
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.set(withTiming(0, { duration: 180 }));
            onBlur?.(e);
          }}
          style={[styles.input, props.multiline && styles.inputMultilineText, style]}
          {...props}
        />
      </Animated.View>
      {error ? (
        <Txt variant="tiny" color={colors.danger}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="tiny" muted>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Pill that animates between outlined and filled when selected. */
export function Chip({
  label,
  selected,
  onPress,
  disabled,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const press = usePressScale(0.94);
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: 200 }));
  }, [selected, on]);
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.surface, colors.primary]),
    borderColor: interpolateColor(on.value, [0, 1], [colors.border, colors.primary]),
  }));
  return (
    <AnimatedPressable
      onPress={() => {
        haptics.select();
        onPress?.();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, fill, disabled && styles.disabled, style, press.style]}>
      <Text maxFontSizeMultiplier={1.4} style={[styles.chipText, selected && { color: colors.textOnPrimary }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/** Switch in brand colours. On web it is kept left-to-right so the knob stays inside the track. */
export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={Platform.OS === 'web' ? styles.ltr : undefined}>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptics.select();
          onValueChange(v);
        }}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={value ? colors.background : colors.textMuted}
        ios_backgroundColor={colors.borderStrong}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.background } : null)}
      />
    </View>
  );
}

// ---------- Feedback ----------

/** Three breathing dots: calmer than a spinner and on-brand. */
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label ?? 'טוען'}>
      <Row gap={spacing.sm}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 160} />
        ))}
      </Row>
      {label ? <Txt muted>{label}</Txt> : null}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0.25);
  useEffect(() => {
    v.set(withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.25, { duration: 420 })), -1),
    ));
  }, [delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.7 + v.value * 0.3 }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Placeholder block with a slow shimmer, for content that is loading. */
export function Skeleton({ height = 72, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0.4);
  useEffect(() => {
    v.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [v]);
  const anim = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[styles.skeleton, { height }, anim, style]} />;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <Appear style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.text} />
      </View>
      <Txt variant="h3" center>
        {title}
      </Txt>
      {message ? (
        <Txt muted center>
          {message}
        </Txt>
      ) : null}
      {action}
    </Appear>
  );
}

export function ErrorBox({ message }: { message: string | null | undefined }) {
  useEffect(() => {
    if (message) haptics.warning();
  }, [message]);
  if (!message) return null;
  return (
    <Animated.View
      key={message}
      entering={FadeInDown.duration(260)}
      style={styles.errorBox}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      <Txt variant="small" color={colors.danger} style={styles.flex}>
        {message}
      </Txt>
    </Animated.View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Row style={styles.sectionTitle}>
      <Txt variant="h3" style={styles.flex}>
        {children}
      </Txt>
      {action}
    </Row>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ltr: { direction: 'ltr' },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: spacing.lg },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  disabled: { opacity: 0.35 },
  text: { color: colors.text, writingDirection: 'rtl' },
  label: { letterSpacing: 1.6, color: colors.textMuted, fontFamily: family.medium },
  button: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: spacing.lg },
  buttonText: { fontSize: font.body, fontFamily: family.semibold },
  iconButton: { padding: spacing.sm, borderRadius: radius.pill },
  iconButtonFilled: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  field: { gap: spacing.xs + 2 },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    fontSize: font.body,
    fontFamily: family.regular,
    color: colors.text,
    // Native apps run in forced-RTL mode, where the default alignment is already right.
    ...(Platform.OS === 'web' ? { textAlign: 'right' as const, outlineStyle: 'none' as never } : null),
    writingDirection: 'rtl',
  },
  inputMultiline: { minHeight: 100 },
  inputMultilineText: { minHeight: 98, paddingTop: spacing.md, textAlignVertical: 'top' },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: { fontSize: font.small, fontFamily: family.medium, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text },
  skeleton: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sectionTitle: { marginTop: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});

