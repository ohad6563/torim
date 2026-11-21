import { StyleSheet, View } from 'react-native';

import { Card, Screen, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

/** Shown in development when the Supabase keys have not been configured yet. */
export function SetupNeeded() {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <Txt variant="h1">כמעט מוכנים</Txt>
        <Card>
          <Txt bold>חסרים פרטי החיבור ל־Supabase</Txt>
          <Txt muted>
            צרו קובץ בשם ‎.env.local‎ בתיקיית הפרויקט (אפשר להעתיק את ‎.env.example‎) ומלאו בו את
            הכתובת ואת המפתח הציבורי של הפרויקט ב־Supabase. אחר כך הפעילו מחדש את השרת.
          </Txt>
          <View style={styles.code}>
            <Txt variant="small" style={styles.mono}>
              EXPO_PUBLIC_SUPABASE_URL=...{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY=...
            </Txt>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, paddingTop: spacing.xxl },
  code: { backgroundColor: colors.primarySoft, borderRadius: 8, padding: spacing.md },
  mono: { fontFamily: 'monospace', writingDirection: 'ltr', textAlign: 'left' },
});
