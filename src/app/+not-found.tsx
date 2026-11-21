import { router } from 'expo-router';

import { Button, EmptyState, Screen } from '@/components/ui';

/** Unknown address (old or mistyped link). */
export default function NotFound() {
  return (
    <Screen edges={['top', 'bottom']}>
      <EmptyState
        icon="compass-outline"
        title="הדף לא נמצא"
        message="ייתכן שהקישור ישן או שגוי."
        action={<Button title="למסך הראשי" onPress={() => router.replace('/')} />}
      />
    </Screen>
  );
}
