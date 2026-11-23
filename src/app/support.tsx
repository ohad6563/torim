import { Linking, View } from 'react-native';

import { LegalPage, type LegalSection } from '@/components/legal-page';
import { Button } from '@/components/ui';
import { formatPhone } from '@/lib/dates';
import { whatsappUrl } from '@/lib/links';
import { contactLine, STUDIO } from '@/lib/studio';
import { spacing } from '@/theme';

/** Support page — the "Support URL" for App Store Connect. Public, served on the web at /support. */
export default function Support() {
  const contact = contactLine(formatPhone);
  const sections: LegalSection[] = [
    {
      title: 'יצירת קשר',
      body: contact ? `${contact}.` : 'אפשר לפנות לסטודיו בטלפון או בוואטסאפ מתוך מסך הבית באפליקציה.',
    },
    {
      title: 'איך קובעים תור?',
      body: 'נכנסים עם Google או Apple, בוחרים טיפול, יום ושעה, ומאשרים. אישור ותזכורות יגיעו כהתראה לטלפון.',
    },
    {
      title: 'איך מבטלים?',
      body: `ב״התורים שלי״ בוחרים את התור ומקישים ״ביטול״. ביטול ללא עלות עד ${STUDIO.cancelHours} שעות לפני התור.`,
    },
    {
      title: 'לא מגיעות תזכורות',
      body: 'בודקים שההתראות של האפליקציה מופעלות בהגדרות הטלפון, ובאפליקציה: פרופיל ← תזכורות.',
    },
    {
      title: 'איך מוחקים את החשבון?',
      body: 'פרופיל ← מחיקת החשבון. המחיקה מסירה את השם, הטלפון וההערות, ומבטלת תורים עתידיים.',
    },
  ];
  return (
    <View style={{ flex: 1 }}>
      <LegalPage
        sections={sections}
        links={[
          { label: 'תנאי השימוש', href: '/terms' },
          { label: 'מדיניות הפרטיות', href: '/privacy' },
          { label: 'הצהרת נגישות', href: '/accessibility' },
          { label: 'מחיקת חשבון', href: '/delete-account' },
        ]}
      />
      {STUDIO.phone ? (
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Button
            title="וואטסאפ לסטודיו"
            icon="logo-whatsapp"
            onPress={() => Linking.openURL(whatsappUrl(STUDIO.phone, `היי, אשמח לעזרה עם האפליקציה של ${STUDIO.name}`))}
          />
        </View>
      ) : null}
    </View>
  );
}
