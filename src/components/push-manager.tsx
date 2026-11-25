import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth';
import { showMessage } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { pushSupported, registerForPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

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
    // Buttons on the day-before reminder (the server sends it with categoryId "reminder").
    // Both open the app: an action that runs in the background is lost if the app was closed.
    Notifications.setNotificationCategoryAsync('reminder', [
      { identifier: 'confirm', buttonTitle: 'מגיעה ✓', options: { opensAppToForeground: true } },
      { identifier: 'reschedule', buttonTitle: 'צריכה להזיז', options: { opensAppToForeground: true } },
    ]).catch(() => {});

    const handle = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data ?? {};
      const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : null;
      const appointmentId = typeof data.appointmentId === 'string' ? data.appointmentId : null;
      if (response.actionIdentifier === 'confirm' && appointmentId) {
        haptics.success();
        supabase
          .rpc('confirm_my_appointment', { p_id: appointmentId })
          .then(({ error }) => showMessage(error ? 'לא הצלחנו לאשר' : 'תודה, אישרת הגעה ✓', error ? errorMessage(error) : 'נתראה!'));
        router.push('/appointments');
        return;
      }
      if (response.actionIdentifier === 'reschedule') {
        router.push('/appointments');
        return;
      }
      if (url) router.push(url as Href);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    // A tap that launched the app from closed arrives before the listener exists.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) {
          handle(r);
          Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      })
      .catch(() => {});
    return () => sub.remove();
  }, []);

  return null;
}
