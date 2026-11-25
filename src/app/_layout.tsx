import {
  Heebo_300Light,
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/heebo';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PushManager } from '@/components/push-manager';
import { SetupNeeded } from '@/components/setup-needed';
import { Button, EmptyState } from '@/components/ui';
import { AuthProvider } from '@/context/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, family } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});


// The whole app is Hebrew, right-to-left.
if (Platform.OS === 'web') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
  document.documentElement.style.backgroundColor = colors.background;
  document.documentElement.style.colorScheme = colors.isDark ? 'dark' : 'light';
} else if (!I18nManager.isRTL) {
  // Native builds are already forced to RTL by the expo-localization plugin (app.json);
  // this is a fallback for Expo Go during development.
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const baseNav = colors.isDark ? DarkTheme : DefaultTheme;
const navTheme = {
  ...baseNav,
  colors: {
    ...baseNav.colors,
    primary: colors.text,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

/**
 * If a screen throws while rendering, show a message with "try again" instead of
 * letting the error close the whole app (in release builds an uncaught render error is fatal).
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: 24 }}>
      <EmptyState
        icon="alert-circle-outline"
        title="משהו השתבש במסך הזה"
        message="אפשר לנסות שוב. אם זה חוזר, ספרו לנו."
        action={<Button title="נסו שוב" onPress={retry} />}
      />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Heebo_300Light,
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
    Heebo_800ExtraBold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
        {isSupabaseConfigured ? (
          <AuthProvider>
            <PushManager />
            <Stack
              screenOptions={{
                headerTintColor: colors.text,
                headerTitleStyle: { color: colors.text, fontFamily: family.semibold, fontSize: 17 },
                headerStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
                headerBackButtonDisplayMode: 'minimal',
                headerTitleAlign: 'center',
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade_from_bottom',
              }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="signup" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="complete-profile" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="privacy" options={{ title: 'מדיניות פרטיות' }} />
              <Stack.Screen name="delete-account" options={{ title: 'מחיקת חשבון' }} />
              <Stack.Screen name="terms" options={{ title: 'תנאי שימוש' }} />
              <Stack.Screen name="accessibility" options={{ title: 'הצהרת נגישות' }} />
              <Stack.Screen name="support" options={{ title: 'תמיכה ויצירת קשר' }} />
              <Stack.Screen name="+not-found" options={{ title: 'לא נמצא' }} />
              <Stack.Screen name="(owner)" options={{ headerShown: false }} />
              <Stack.Screen name="(customer)" options={{ headerShown: false }} />
              <Stack.Screen name="studio" options={{ title: 'תצוגת לקוח' }} />
              <Stack.Screen name="appointment/new" options={{ title: 'תור חדש', presentation: 'modal' }} />
              <Stack.Screen name="appointment/[id]" options={{ title: 'פרטי תור' }} />
              <Stack.Screen name="customer/[id]" options={{ title: 'כרטיס לקוח' }} />
              <Stack.Screen name="service/[id]" options={{ title: 'שירות', presentation: 'modal' }} />
              <Stack.Screen name="settings/profile" options={{ title: 'פרטי העסק' }} />
              <Stack.Screen name="settings/hours" options={{ title: 'שעות פעילות' }} />
              <Stack.Screen name="settings/time-off" options={{ title: 'חופשות וחסימות' }} />
              <Stack.Screen name="settings/booking" options={{ title: 'הגדרות הזמנה' }} />
              <Stack.Screen name="b/[slug]" options={{ headerShown: false }} />
              <Stack.Screen name="book/[slug]" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="a/[token]" options={{ title: 'התור שלי' }} />
            </Stack>
          </AuthProvider>
        ) : (
          <SetupNeeded />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
