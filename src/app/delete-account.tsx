import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { Appear, Button, Card, Screen, Txt } from '@/components/ui';
import { formatPhone } from '@/lib/dates';
import { STUDIO } from '@/lib/studio';
import { whatsappUrl } from '@/lib/links';
import { spacing } from '@/theme';

/**
 * Public page (no sign-in) explaining how to delete an account and its data.
 * Google Play requires this as a web link (/delete-account) in the Data safety form.
 */
export default function DeleteAccountInfo() {
  return (
    <Screen>
      <Appear>
        <Txt variant="h2">מחיקת חשבון ב״{STUDIO.name}״</Txt>
        <Txt muted>
          {STUDIO.legalName ? `מפעיל האפליקציה: ${STUDIO.legalName}. ` : ''}ניתן למחוק את החשבון ואת המידע בכל עת.
        </Txt>
      </Appear>

      <Appear index={1}>
        <Card>
          <Txt variant="h3">מתוך האפליקציה</Txt>
          <Txt muted>1. נכנסים לאפליקציה עם חשבון Google או Apple.</Txt>
          <Txt muted>2. עוברים ללשונית ״פרופיל״.</Txt>
          <Txt muted>3. לוחצים ״מחיקת החשבון״ ומאשרים.</Txt>
          <Button small variant="secondary" title="כניסה לאפליקציה" onPress={() => router.push('/login')} />
        </Card>
      </Appear>

      {STUDIO.phone || STUDIO.email ? (
        <Appear index={2}>
          <Card>
            <Txt variant="h3">בפנייה לסטודיו</Txt>
            <Txt muted>אפשר גם לבקש מאיתנו למחוק את החשבון. נטפל בבקשה תוך 30 יום.</Txt>
            <View style={{ gap: spacing.sm }}>
              {STUDIO.phone ? (
                <Button
                  small
                  variant="secondary"
                  icon="logo-whatsapp"
                  title={`וואטסאפ · ${formatPhone(STUDIO.phone)}`}
                  onPress={() => Linking.openURL(whatsappUrl(STUDIO.phone, 'אבקש למחוק את החשבון שלי באפליקציה'))}
                />
              ) : null}
              {STUDIO.email ? (
                <Button small variant="secondary" icon="mail-outline" title={STUDIO.email} onPress={() => Linking.openURL(`mailto:${STUDIO.email}`)} />
              ) : null}
            </View>
          </Card>
        </Appear>
      ) : null}

      <Appear index={3}>
        <Card>
          <Txt variant="h3">מה נמחק</Txt>
          <Txt muted>• החשבון והקישור לחשבון Google / Apple.</Txt>
          <Txt muted>• השם, מספר הטלפון וההערות – מכל רישומי הסטודיו.</Txt>
          <Txt muted>• תורים עתידיים מבוטלים.</Txt>
          <Txt variant="h3" style={{ marginTop: spacing.sm }}>
            מה נשאר
          </Txt>
          <Txt muted>רשומה אנונימית של תורים שהתקיימו (טיפול, תאריך ומחיר), ללא פרט מזהה, לצורך רישומי הסטודיו.</Txt>
        </Card>
      </Appear>
    </Screen>
  );
}
