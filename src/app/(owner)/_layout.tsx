import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { Loading, type IconName } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, family } from '@/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'calendar', title: 'יומן', icon: 'calendar-outline' },
  { name: 'waitlist', title: 'המתנה', icon: 'hourglass-outline' },
  { name: 'customers', title: 'לקוחות', icon: 'people-outline' },
  { name: 'services', title: 'שירותים', icon: 'cut-outline' },
  { name: 'settings', title: 'הגדרות', icon: 'settings-outline' },
];

/** The business owner's area. Only reachable when signed in with a business set up. */
export default function OwnerLayout() {
  const { loading, session, business } = useAuth();
  if (loading && !business) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (!business) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          // The default web height clips Hebrew labels.
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
            headerTitle: tab.name === 'calendar' ? business.name : tab.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
