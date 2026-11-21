import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Appear, Screen, Txt } from '@/components/ui';
import { formatPhone } from '@/lib/dates';
import { PROCESSORS, STUDIO } from '@/lib/studio';
import { spacing } from '@/theme';

/**
 * Privacy policy. Public (no sign-in needed) and served on the web at /privacy,
 * so the same address goes into App Store Connect and Google Play.
 */
export default function Privacy() {
  const controller = [
    STUDIO.legalName || STUDIO.name,
    STUDIO.businessId && `ע.מ./ח.פ. ${STUDIO.businessId}`,
    STUDIO.address,
  ]
    .filter(Boolean)
    .join(' · ');
  const contact = [STUDIO.email, STUDIO.phone && formatPhone(STUDIO.phone)].filter(Boolean).join(' · ');

  const sections: { title: string; body: string }[] = [
    {
      title: 'מי אחראי על המידע',
      body:
        `האפליקציה ״${STUDIO.name}״ מופעלת על ידי ${controller}, שהוא בעל השליטה במאגר המידע. ` +
        (contact ? `לפניות בנושא פרטיות: ${contact}.` : 'לפניות בנושא פרטיות ניתן לפנות לסטודיו בפרטי הקשר שבאפליקציה.'),
    },
    {
      title: 'אילו פרטים נאספים',
      body:
        'בכניסה עם Google או Apple מתקבלים מהם השם וכתובת האימייל (ב־Apple אפשר לבחור להסתיר את האימייל). ' +
        'בנוסף נשמרים מספר טלפון נייד שהזנת, שם מלא, פרטי התורים שקבעת (טיפול, תאריך, שעה, מחיר וסטטוס), ' +
        'והערה לתור אם בחרת לכתוב. הסטודיו יכול להוסיף לכרטיס הלקוח הערות פנימיות הקשורות לטיפול. ' +
        'אנו לא אוספים מיקום, אנשי קשר, תמונות או מידע לצורכי פרסום.',
    },
    {
      title: 'למה ועל סמך מה',
      body:
        'המידע משמש אך ורק לניהול התורים: זיהוי בכניסה, שמירת התורים, הצגתם לך ולסטודיו, ויצירת קשר בנוגע לתור. ' +
        'מסירת השם ומספר הטלפון נדרשת כדי לקבוע תור; ללא הסכמה לכך לא ניתן לקבוע תור דרך האפליקציה. ' +
        'אנו לא מקבלים את סיסמת חשבון Google או Apple שלך ולא גישה לתוכן החשבון. ' +
        'אין חובה חוקית למסור את המידע.',
    },
    {
      title: 'מי רואה את המידע',
      body:
        'פרטייך ותורייך גלויים רק לך ולצוות הסטודיו המורשה. לקוחות אחרים רואים רק אילו שעות פנויות. ' +
        'איננו מוכרים, משכירים או משתפים מידע עם מפרסמים, ואין באפליקציה כלי מעקב או פרסום של צד שלישי.',
    },
    {
      title: 'ספקי שירות והעברה לחו״ל',
      body:
        'לצורך הפעלת השירות המידע מעובד אצל ספקים מטעמנו, בהתאם להסכמי עיבוד מידע: ' +
        PROCESSORS.map((p) => `${p.name} – ${p.role}`).join('; ') +
        '. המשמעות היא שהמידע נשמר גם מחוץ לישראל, אצל ספקים המחויבים לרמת הגנה מתאימה.',
    },
    {
      title: 'אבטחת מידע',
      body:
        'התקשורת מוצפנת (HTTPS). הגישה לנתונים מוגבלת ברמת מסד הנתונים כך שכל משתמש רואה רק את המידע שלו, ' +
        'ורק צוות הסטודיו המאומת רואה את פרטי הלקוחות. במכשיר נשמר רק אסימון ההתחברות, כדי שלא תצטרכו להיכנס מחדש בכל פעם.',
    },
    {
      title: 'כמה זמן נשמר המידע',
      body:
        'פרטי החשבון נשמרים כל עוד החשבון פעיל. היסטוריית התורים נשמרת לצורך ניהול הסטודיו ורישומיו. ' +
        'כשמוחקים את החשבון, השם, הטלפון וההערות נמחקים מכל רישומי הסטודיו, ותורים עתידיים מבוטלים; ' +
        'נשארת רק רשומה אנונימית של תורים שהתקיימו (טיפול, תאריך ומחיר), שאינה מזהה אותך.',
    },
    {
      title: 'הזכויות שלך',
      body:
        'לפי חוק הגנת הפרטיות, התשמ״א-1981, ניתן לעיין במידע עליך, לבקש לתקן או למחוק אותו, ולמחוק את החשבון בכל עת ' +
        'מתוך האפליקציה (פרופיל ← מחיקת החשבון). את השם והטלפון ניתן לעדכן בפרופיל. ' +
        'אם לדעתך זכויותיך נפגעו, ניתן לפנות לרשות להגנת הפרטיות.',
    },
    {
      title: 'קטינים',
      body: 'האפליקציה מיועדת לבני 16 ומעלה. קטינים מתחת לגיל זה יקבעו תור באמצעות הורה.',
    },
    {
      title: 'שינויים במדיניות',
      body: 'אם המדיניות תשתנה באופן מהותי, נעדכן כאן ובאפליקציה. תאריך העדכון האחרון מופיע בראש העמוד.',
    },
  ];

  return (
    <Screen>
      <Txt variant="small" muted>
        עודכן לאחרונה: נובמבר 2026
      </Txt>
      {sections.map((s, i) => (
        <Appear key={s.title} index={i}>
          <View style={{ gap: spacing.xs }}>
            <Txt variant="h3">{s.title}</Txt>
            <Txt muted>{s.body}</Txt>
          </View>
        </Appear>
      ))}
      <Pressable onPress={() => router.push('/delete-account')} accessibilityRole="link" style={{ paddingVertical: spacing.md }}>
        <Txt muted center style={{ textDecorationLine: 'underline' }}>
          איך מוחקים את החשבון והמידע
        </Txt>
      </Pressable>
    </Screen>
  );
}
