import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth';
import { pushSupported, registerForPush } from '@/lib/push';

/**
 * Keeps this device registered for reminders while signed in (silently, only if
 * permission was already given), and opens the right screen when a
 * notification is tapped.
 */
export function PushManager() {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!pushSupported || !userId) return;
    registerForPush({ ask: false });
  }, [userId]);

  useEffect(() => {
    if (!pushSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    });
    return () => sub.remove();
  }, []);

  return null;
}
