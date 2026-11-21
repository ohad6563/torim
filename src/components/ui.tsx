import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, type ReactNode } from 'react';
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
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, font, MAX_WIDTH, radius, shadow, spacing } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Layout ----------

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
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
}: ScreenProps) {
  const inner = <View style={[styles.column, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
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

export function Row({ children, style, gap = spacing.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        accessibilityRole="button">
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Text ----------

type TxtProps = {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
  muted?: boolean;
  bold?: boolean;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function Txt({ children, variant = 'body', muted, bold, color, center, style, numberOfLines }: TxtProps) {
  const isHeading = variant === 'h1' || variant === 'h2' || variant === 'h3';
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.text,
        { fontSize: font[variant], lineHeight: Math.round(font[variant] * 1.4) },
        isHeading && styles.heading,
        bold && styles.bold,
        muted && { color: colors.textMuted },
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
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style }: ButtonProps) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Row gap={spacing.sm} style={{ justifyContent: 'center' }}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 20} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: font.small }, { color: palette.fg }]}>{title}</Text>
        </Row>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.primary,
  label,
  size = 22,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

// ---------- Inputs ----------

type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string };

export function Field({ label, error, hint, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Txt variant="small" bold>
        {label}
      </Txt>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, props.multiline && styles.inputMultiline, error ? styles.inputError : null, style]}
        {...props}
      />
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.chipText, selected && { color: colors.textOnPrimary }]}>{label}</Text>
    </Pressable>
  );
}

/** Switch in brand colours. On web it is kept left-to-right so the knob stays inside the track. */
export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={Platform.OS === 'web' ? styles.ltr : undefined}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surface}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.surface } : null)}
      />
    </View>
  );
}

// ---------- Feedback ----------

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Txt muted>{label}</Txt> : null}
    </View>
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
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={32} color={colors.primary} />
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
    </View>
  );
}

export function ErrorBox({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Txt variant="small" color={colors.danger} style={styles.flex}>
        {message}
      </Txt>
    </View>
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadow,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  text: { color: colors.text, writingDirection: 'rtl' },
  heading: { fontWeight: '700' },
  bold: { fontWeight: '600' },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: spacing.md },
  buttonText: { fontSize: font.body, fontWeight: '600' },
  iconButton: { padding: spacing.sm, borderRadius: radius.pill },
  field: { gap: spacing.xs },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: font.body,
    color: colors.text,
    // Native apps run in forced-RTL mode, where the default alignment is already right.
    ...(Platform.OS === 'web' ? { textAlign: 'right' as const } : null),
    writingDirection: 'rtl',
  },
  inputMultiline: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.small, fontWeight: '600', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
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
