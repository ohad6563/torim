import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SetupNeeded } from '@/components/setup-needed';
import { AuthProvider } from '@/context/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

// The whole app is Hebrew, right-to-left.
if (Platform.OS === 'web') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
} else if (!I18nManager.isRTL) {
  // Native builds are already forced to RTL by the expo-localization plugin (app.json);
  // this is a fallback for Expo Go during development.
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isSupabaseConfigured ? (
        <AuthProvider>
          <Stack
            screenOptions={{
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.text, fontWeight: '700' },
              headerStyle: { backgroundColor: colors.surface },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: 'התחברות' }} />
            <Stack.Screen name="signup" options={{ title: 'הרשמה' }} />
            <Stack.Screen name="onboarding" options={{ title: 'הקמת העסק', headerBackVisible: false }} />
            <Stack.Screen name="(owner)" options={{ headerShown: false }} />
            <Stack.Screen name="appointment/new" options={{ title: 'תור חדש', presentation: 'modal' }} />
            <Stack.Screen name="appointment/[id]" options={{ title: 'פרטי תור' }} />
            <Stack.Screen name="customer/[id]" options={{ title: 'כרטיס לקוח' }} />
            <Stack.Screen name="service/[id]" options={{ title: 'שירות', presentation: 'modal' }} />
            <Stack.Screen name="settings/profile" options={{ title: 'פרטי העסק' }} />
            <Stack.Screen name="settings/hours" options={{ title: 'שעות פעילות' }} />
            <Stack.Screen name="settings/time-off" options={{ title: 'חופשות וחסימות' }} />
            <Stack.Screen name="settings/booking" options={{ title: 'הגדרות הזמנה' }} />
            <Stack.Screen name="b/[slug]" options={{ title: 'קביעת תור' }} />
            <Stack.Screen name="a/[token]" options={{ title: 'התור שלי' }} />
          </Stack>
        </AuthProvider>
      ) : (
        <SetupNeeded />
      )}
    </SafeAreaProvider>
  );
}
