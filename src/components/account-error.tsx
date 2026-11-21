import { useState } from 'react';

import { Button, EmptyState, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth';

/** Shown when the account couldn't be loaded (usually no network), with a retry. */
export function AccountError() {
  const { accountError, refresh, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Screen edges={['top', 'bottom']}>
      <EmptyState
        icon="cloud-offline-outline"
        title="אין חיבור כרגע"
        message={accountError ?? 'לא הצלחנו לטעון את החשבון.'}
        action={
          <>
            <Button
              title="נסו שוב"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                await refresh();
                setBusy(false);
              }}
            />
            <Button title="יציאה מהחשבון" variant="ghost" onPress={signOut} />
          </>
        }
      />
    </Screen>
  );
}
