import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Free push notifications through Expo's push service. The server (pg_cron job,
 * migration 0004) sends the booking confirmation and the reminders; the app only
 * asks permission and registers this device's token for the signed-in account.
 */

export const pushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

if (pushSupported) {
  // Show notifications as banners even when the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type PushStatus = 'unsupported' | 'granted' | 'denied' | 'undetermined';

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported || !Device.isDevice) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/**
 * Registers this device for reminders. With `ask`, shows the system permission
 * prompt if it hasn't been answered yet. Returns the resulting status.
 */
export async function registerForPush({ ask }: { ask: boolean }): Promise<PushStatus> {
  if (!pushSupported || !Device.isDevice) return 'unsupported';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'תזכורות לתורים',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return status === 'denied' ? 'denied' : 'undetermined';

  // The EAS project id is set once the app is linked to EAS (eas init).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return 'granted';
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
  } catch {
    // No network or push service unavailable: try again next time the app opens.
  }
  return 'granted';
}

/** Stops reminders on this device (e.g. on sign-out). */
export async function unregisterPush() {
  if (!pushSupported || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // best effort
  }
}
