import { LegalPage, type LegalSection } from '@/components/legal-page';
import { formatPhone } from '@/lib/dates';
import { contactLine, LEGAL_UPDATED, STUDIO } from '@/lib/studio';

/**
 * Accessibility statement (הצהרת נגישות), as required by the Israeli Equal Rights
 * for Persons with Disabilities regulations (תקנה 35). Public, served on the web at /accessibility.
 */
export default function Accessibility() {
  const contact = STUDIO.accessibilityContact || contactLine(formatPhone);
  const sections: LegalSection[] = [
    {
      title: 'המחויבות שלנו',
      body:
        `${STUDIO.name} רואה חשיבות במתן שירות שוויוני לכל הלקוחות, ופועלת כדי שהאפליקציה והאתר יהיו נגישים לאנשים עם מוגבלות, ` +
        'בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ״ח-1998, ותקנות הנגישות לשירות, ולפי התקן הישראלי 5568 (המבוסס על WCAG 2.0 ברמה AA).',
    },
    {
      title: 'מה הונגש',
      body:
        'תמיכה בקוראי מסך (VoiceOver ו־TalkBack): לכפתורים, לשדות ולבחירת היום והשעה יש תיאור קולי. ' +
        'תמיכה בהגדלת טקסט של מערכת ההפעלה. ניגודיות גבוהה בין טקסט לרקע. ' +
        'כיבוי הנפשות ותנועה כשמופעלת בטלפון ההגדרה ״הפחתת תנועה״. ' +
        'תפעול מלא ממקלדת באתר. כיוון קריאה מימין לשמאל ושפה עברית מוגדרים במערכת. ' +
        'הודעות שגיאה מוצגות בטקסט ולא רק בצבע.',
    },
    {
      title: 'מגבלות ידועות',
      body:
        'סרטון הרקע הוא אווירה בלבד, ללא מידע או קול, ולכן אין לו כתוביות. ייתכן שחלקים מסוימים עדיין אינם נגישים במלואם; ' +
        'אנו ממשיכים לבדוק ולשפר. אם נתקלת בקושי, נשמח לקבוע עבורך תור בטלפון או בוואטסאפ.',
    },
    {
      title: 'נגישות הסטודיו',
      body:
        'לפרטים על הנגישות הפיזית של הסטודיו (חניה, גישה למבנה וכדומה) אפשר לפנות אלינו לפני ההגעה, ונשמח לעזור ולהתאים את הביקור.',
    },
    {
      title: 'פנייה בנושא נגישות',
      body:
        (contact ? `רכז/ת הנגישות: ${contact}. ` : 'לפניות בנושא נגישות ניתן לפנות לסטודיו בפרטי הקשר שבאפליקציה. ') +
        'נשמח לקבל משוב, ונשתדל לענות תוך 14 ימים. מומלץ לציין את המסך, את הבעיה ואת סוג המכשיר וטכנולוגיית העזר.',
    },
    {
      title: 'עדכון ההצהרה',
      body: `ההצהרה עודכנה בתאריך: ${LEGAL_UPDATED}.`,
    },
  ];
  return <LegalPage sections={sections} links={[{ label: 'תנאי השימוש', href: '/terms' }]} />;
}
