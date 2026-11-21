import { View } from 'react-native';

import { Appear, Screen, Txt } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * Privacy policy, shown in the app and reachable on the web (/privacy) so the
 * same address can be given to the App Store and Google Play.
 */
const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'אילו פרטים נאספים',
    body:
      'לקוחות שקובעים תור: שם, מספר טלפון, הערה אם נכתבה, ופרטי התור (טיפול, תאריך ושעה). ' +
      'בעלי עסקים: כתובת אימייל וסיסמה (מוצפנת), ופרטי העסק שהוזנו – שם, טלפון, כתובת, שירותים ושעות פעילות.',
  },
  {
    title: 'למה הפרטים משמשים',
    body:
      'אך ורק לניהול התורים: כדי שהעסק ידע מי מגיע ומתי ויוכל ליצור קשר בנוגע לתור. ' +
      'איננו מוכרים מידע, לא מציגים פרסומות ולא משתמשים בכלי מעקב או פרסום של צד שלישי.',
  },
  {
    title: 'מי רואה את הפרטים',
    body:
      'פרטי הלקוחות והתורים גלויים רק לבעל/ת העסק שאצלו נקבע התור. ' +
      'לקוחות אחרים אינם רואים פרטים אישיים – רק אילו שעות פנויות.',
  },
  {
    title: 'איפה המידע נשמר',
    body:
      'המידע נשמר בשירות הענן Supabase, בחיבור מוצפן. במכשיר עצמו נשמרים רק הקישורים לתורים שקבעת, ' +
      'כדי להציג אותם תחת ״התורים שלי״.',
  },
  {
    title: 'מחיקת מידע',
    body:
      'בעלי עסקים יכולים למחוק את החשבון וכל המידע שלו מתוך האפליקציה (הגדרות ← מחיקת החשבון). ' +
      'לקוחות יכולים לבטל תור בכל עת מדף התור, ולבקש מהעסק למחוק את פרטיהם.',
  },
  {
    title: 'יצירת קשר',
    body: 'לשאלות על פרטיות ניתן לפנות ישירות לעסק, בטלפון או בוואטסאפ המופיעים בדף העסק.',
  },
];

export default function Privacy() {
  return (
    <Screen>
      <Txt variant="small" muted>
        עודכן לאחרונה: נובמבר 2026
      </Txt>
      {SECTIONS.map((s, i) => (
        <Appear key={s.title} index={i}>
          <View style={{ gap: spacing.xs }}>
            <Txt variant="h3">{s.title}</Txt>
            <Txt muted>{s.body}</Txt>
          </View>
        </Appear>
      ))}
    </Screen>
  );
}
