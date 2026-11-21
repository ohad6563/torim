import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { AccountError } from '@/components/account-error';
import { Loading, type IconName } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, family } from '@/theme';

const TABS: { name: string; title: string; icon: IconName; header: boolean }[] = [
  { name: 'home', title: 'בית', icon: 'sparkles-outline', header: false },
  { name: 'appointments', title: 'התורים שלי', icon: 'calendar-outline', header: true },
  { name: 'profile', title: 'פרופיל', icon: 'person-outline', header: true },
];

/** The customer app. Signed-in accounts that don't manage the studio land here. */
export default function CustomerLayout() {
  const { loading, session, isAdmin, profile, accountError } = useAuth();
  if (loading && !session) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (isAdmin) return <Redirect href="/calendar" />;
  if (accountError && !profile) return <AccountError />;
  if (!loading && (!profile?.full_name || !profile?.phone)) return <Redirect href="/complete-profile" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { height: 62, paddingTop: 4, paddingBottom: 6 } : null),
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: family.medium, lineHeight: 16 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontFamily: family.semibold, fontSize: 17 },
        headerTitleAlign: 'center',
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerShown: tab.header,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
