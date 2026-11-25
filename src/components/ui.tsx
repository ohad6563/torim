import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
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
  FadeIn,
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
import { colors, family, font, MAX_WIDTH, motion, radius, spacing, springs } from '@/theme';

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

/** Fades its children in (opacity only). Pass `index` for a short stagger in a list (capped). */
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
      entering={FadeIn.duration(motion.base)
        .delay(delay + Math.min(index, 4) * 40)
        .easing(Easing.bezier(...motion.curve))}
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
  /** Inline link inside a sentence. */
  onPress?: () => void;
  accessibilityRole?: 'header' | 'link' | 'text';
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
  onPress,
  accessibilityRole,
}: TxtProps) {
  const size = font[variant];
  const w = weight ?? (bold ? 'semibold' : VARIANT_WEIGHT[variant]);
  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      accessibilityRole={accessibilityRole ?? (onPress ? 'link' : undefined)}
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
  /** 'inverse': white button for use on top of the dark hero. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
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
    inverse: { bg: '#FFFFFF', fg: '#141210', border: '#FFFFFF' },
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
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={(e) => {
            focus.set(withTiming(1, { duration: motion.fast }));
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.set(withTiming(0, { duration: motion.fast }));
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
    on.set(withTiming(selected ? 1 : 0, { duration: motion.fast }));
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
export function Toggle({
  value,
  onValueChange,
  label,
  text,
  hint,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label?: string;
  /** Visible label; with it the whole row (label + switch) is one tap target. */
  text?: string;
  /** Small muted line under `text`. */
  hint?: string;
}) {
  // The whole 44pt area (and the label next to it, via `text`) toggles, not just the small track.
  const sw = (
    <View style={Platform.OS === 'web' ? styles.ltr : undefined} pointerEvents="none">
      <Switch
        value={value}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={value ? colors.background : colors.textMuted}
        ios_backgroundColor={colors.borderStrong}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.background } : null)}
      />
    </View>
  );
  if (text)
    return (
      <Pressable
        onPress={() => {
          haptics.select();
          onValueChange(!value);
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label ?? text}
        style={styles.toggleRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold>{text}</Txt>
          {hint ? (
            <Txt variant="small" muted>
              {hint}
            </Txt>
          ) : null}
        </View>
        {sw}
      </Pressable>
    );
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onValueChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.toggle, Platform.OS === 'web' && styles.ltr]}>
      <Switch
        accessibilityLabel={label}
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
    </Pressable>
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

/** Placeholder block with a light sweeping across it (shimmer) while content loads. */
export function Skeleton({ height = 72, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!w) return;
    x.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false));
  }, [w, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * w * 2 }] }));
  return (
    <View
      style={[styles.skeleton, { height }, style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityLabel="טוען">
      <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
        <LinearGradient
          colors={['transparent', colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.75)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Any content that springs down a little when pressed (with a light haptic). */
export function PressableScale({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const press = usePressScale(0.97);
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
      style={[style, press.style]}>
      {children}
    </AnimatedPressable>
  );
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
      entering={FadeIn.duration(motion.fast)}
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
  toggle: { minHeight: 44, minWidth: 52, justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
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
  buttonSmall: { minHeight: 44, paddingHorizontal: spacing.lg },
  buttonText: { fontSize: font.body, fontFamily: family.semibold },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
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
  skeleton: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, overflow: 'hidden' },
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

