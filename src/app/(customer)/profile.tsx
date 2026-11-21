import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Appear, Button, Card, ErrorBox, Field, Row, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { formatPhone } from '@/lib/dates';
import { confirm, showMessage } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

export default function Profile() {
  const { session, profile, refresh, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInName = profile?.full_name ?? '';

  function startEditing() {
    setName(profile?.full_name ?? '');
    setError(null);
    setEditing(true);
  }

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם מלא.');
    setBusy(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', session!.user.id);
    setBusy(false);
    if (err) return setError(errorMessage(err));
    await refresh();
    setEditing(false);
  }

  async function logout() {
    if (await confirm('יציאה', 'להתנתק מהחשבון?', { confirmText: 'יציאה' })) {
      await signOut();
      router.replace('/login');
    }
  }

  async function deleteAccount() {
    const ok = await confirm(
      'מחיקת החשבון',
      'החשבון ייסגר, השם והטלפון שלך יימחקו מכל רישומי הסטודיו, ותורים עתידיים יבוטלו. אי אפשר לבטל את הפעולה.',
      { confirmText: 'מחיקה', destructive: true },
    );
    if (!ok) return;
    const { error: err } = await supabase.rpc('delete_my_account');
    if (err) return showMessage('המחיקה נכשלה', errorMessage(err));
    await signOut();
    router.replace('/login');
  }

  return (
    <Screen>
      <Appear>
        {editing ? (
          <Card style={{ gap: spacing.md }}>
            <Field label="שם מלא" value={name} onChangeText={setName} />
            <Txt variant="small" muted>
              מספר הטלפון הוא מספר הכניסה שלך ולא ניתן לשנות אותו כאן.
            </Txt>
            <ErrorBox message={error} />
            <Row>
              <Button style={{ flex: 1 }} title="שמירה" onPress={save} loading={busy} />
              <Button style={{ flex: 1 }} title="ביטול" variant="ghost" onPress={() => setEditing(false)} />
            </Row>
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Txt variant="h1" color={colors.textOnPrimary}>
                {(signInName || '?').trim().charAt(0)}
              </Txt>
            </View>
            <Txt variant="h2" center>
              {profile?.full_name || 'החשבון שלי'}
            </Txt>
            {profile?.phone ? (
              <Txt muted center>
                {formatPhone(profile.phone)}
              </Txt>
            ) : null}
            <Button small variant="secondary" icon="create-outline" title="עריכת שם" onPress={startEditing} />
          </Card>
        )}
      </Appear>

      <Appear index={1} style={{ gap: spacing.sm }}>
        <Button title="יציאה מהחשבון" variant="secondary" icon="log-out-outline" onPress={logout} />
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" style={{ padding: spacing.md }}>
          <Txt variant="small" muted center>
            מדיניות פרטיות
          </Txt>
        </Pressable>
        <Pressable onPress={deleteAccount} accessibilityRole="button" style={{ padding: spacing.md }}>
          <Txt variant="small" color={colors.danger} center>
            מחיקת החשבון
          </Txt>
        </Pressable>
      </Appear>
    </Screen>
  );
}
