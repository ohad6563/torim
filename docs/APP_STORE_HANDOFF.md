# מסירה: העלאת "הגבות של הילה" ל־App Store ול־TestFlight

המסמך מיועד למי שמחזיק את חשבון Apple Developer, ול־Claude שעובד איתו. כל מה שצריך לדעת כדי לבנות, להעלות ולבדוק את האפליקציה.

## 1. מה האפליקציה

- אפליקציית קביעת תורים בעברית (RTL) לסטודיו גבות אחד בבאר שבע: "הגבות של הילה".
- **לקוחות:** נכנסים עם Google (ובאייפון גם Apple), מוסיפים שם וטלפון פעם אחת, קובעים, מבטלים ורואים תורים, ומקבלים התראות push.
- **מנהלים (לפי אימייל):** יומן, לקוחות, שירותים, שעות פעילות, חופשות.
- **טכנולוגיה:** Expo SDK 58 (React Native 0.88, expo-router), Supabase (Postgres + Auth), EAS לבנייה ולהגשה.
- **ריפו:** https://github.com/ohad6563/torim (ענף `main`). README.md מתאר את המבנה.

## 2. מה כבר מוגדר בקוד (לא לשנות בלי סיבה)

| נושא | ערך | איפה |
|---|---|---|
| Bundle ID (iOS) / package (Android) | `com.hilabrows.app` | `app.json` |
| שם באפליקציה | הגבות של הילה | `app.json`, `assets/locales/he.json` |
| URL scheme | `hilabrows` | `app.json` |
| iPhone בלבד | `ios.supportsTablet: false` | `app.json` |
| Sign in with Apple | `ios.usesAppleSignIn: true` + plugin | `app.json` |
| Privacy manifest | `ios.privacyManifests` (UserDefaults, FileTimestamp, DiskSpace, SystemBootTime) | `app.json` |
| הצפנה | `usesNonExemptEncryption: false` | `app.json` |
| שפה | `CFBundleDevelopmentRegion: he` | `app.json` |
| חיבור לשרת (ציבורי, מותר בקוד) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` |
| סטודיו / פלטה | `EXPO_PUBLIC_BUSINESS_SLUG=hila-brows`, `EXPO_PUBLIC_THEME=porcelain` | `.env` |
| כתובת אתר לקישורים | `EXPO_PUBLIC_APP_URL` | `eas.json` → `build.production.env` |
| גרסאות | `appVersionSource: remote`, `autoIncrement` | `eas.json` |

> חשוב: `.env` נמצא בריפו ומכיל רק מפתחות ציבוריים (publishable). EAS קורא אותו בבנייה. אם הבנייה רצה בלעדיו, האפליקציה תציג מסך "כמעט מוכנים" ותידחה.

## 3. צעדים לבנייה ולהגשה

```bash
git clone https://github.com/ohad6563/torim && cd torim
```

```bash
npm install
```

```bash
npx tsc --noEmit
```

```bash
npx eslint src
```

1. **חיבור ל־EAS** (יוצר פרויקט ומוסיף `extra.eas.projectId` ל־`app.json`, שנדרש גם להתראות push):
   ```bash
   npx eas-cli@latest init
   ```
   יש לשמור את השינוי ב־`app.json` בריפו (commit). בלי projectId ההתראות לא יעבדו.
2. **Apple Developer → Identifiers:** App ID `com.hilabrows.app` עם יכולות **Sign In with Apple** ו־**Push Notifications**. EAS יכול ליצור את זה אוטומטית בשלב הבא.
3. **App Store Connect:** ליצור אפליקציה חדשה: שם "הגבות של הילה", שפה ראשית Hebrew, Bundle ID `com.hilabrows.app`, SKU חופשי.
4. **בנייה:**
   ```bash
   npx eas-cli@latest build -p ios --profile production
   ```
   להתחבר לחשבון Apple כשמתבקשים, ולאשר ל־EAS לנהל certificates, provisioning ו־**APNs key** (נדרש להתראות).
5. **העלאה ל־TestFlight:**
   ```bash
   npx eas-cli@latest submit -p ios --latest
   ```
6. **TestFlight:** להוסיף בודקים פנימיים (Internal Testing) ולהתקין דרך אפליקציית TestFlight.

## 4. הגדרות ב־Supabase שצריך לעשות (בעל הפרויקט, אוהד)

- **Apple:** Authentication → Sign In / Providers → **Apple** → Enable. ב־**Client IDs** מזינים `com.hilabrows.app`. לכניסה מהאייפון (native) לא צריך Secret Key.
- **Redirect URLs:** כבר מוגדרים (`hilabrows://**`).
- **מנהלים:** כשיהיה המייל של הילה, מריצים ב־SQL Editor:
  `insert into reserved_admin_emails (email, business_slug) values ('<email>', 'hila-brows');`

## 5. בדיקות ב־TestFlight

- [ ] כניסה עם Apple וכניסה עם Google, ואחריהן מסך "שם + טלפון", ואז מסך הבית.
- [ ] קביעת תור ← מסך "נתראה!" ← "הפעלת תזכורות" ← מגיעה התראת "התור נקבע ✓" תוך כדקה.
- [ ] "התורים שלי" מציג את התור, וביטול עובד.
- [ ] פרופיל: עריכת שם וטלפון, יציאה, מחיקת חשבון.
- [ ] כניסה עם המייל המנהל (`ohad6563@gmail.com`) ← מסך הניהול: יומן, הוספת תור ידני, שעות.
- [ ] RTL תקין, אנימציות חלקות, אין מסך לבן בפתיחה.

## 6. מידע ל־App Store Connect

- **Privacy Policy URL:** https://ohad6563.github.io/torim/privacy
- **App Privacy:** כל הנתונים Linked to user, למטרת App Functionality, ולא לצורכי מעקב (Not used for tracking):
  - Contact Info: **Name**, **Email Address**, **Phone Number**
  - Identifiers: **User ID**, **Device ID** (push token)
  - User Content: **Other User Content** (הערה לתור)
  - אין: מיקום, אנשי קשר, אבחון או אנליטיקה, רכישות.
- **Age rating:** לענות "No" על הכל (צפוי 4+).
- **קטגוריה:** Lifestyle.
- **מדינות:** ישראל בלבד (נמנע מדרישות ה־DSA האירופיות).
- **App Review → Sign-in:** הכניסה היא עם Apple/Google בלבד. הבודקים יכולים להיכנס עם Sign in with Apple בעצמם. לכתוב ב־Notes באנגלית:
  > Sign in with Apple or Google. After the first sign-in the app asks for a name and an Israeli mobile number (any valid format, e.g. 050-0000000). Bookings made during review appear in the studio's real calendar. Management screens are only for studio staff accounts.
- **צילומי מסך:** iPhone 6.9" (אין צורך ב־iPad).
- **תשלומים:** אין כרגע. בעתיד, כיוון שהשירות ניתן פיזית בסטודיו, לא משתמשים ב־IAP (סעיף 3.1.3(e)).

## 7. לפני הגשה לחנות (לא חוסם TestFlight)

1. **פרטים משפטיים במדיניות הפרטיות:** שם בעלת העסק או השם הרשמי, מספר עוסק או ח.פ., כתובת ואימייל. מגדירים כמשתני `EXPO_PUBLIC_STUDIO_*` (ראו `src/lib/studio.ts`).
2. **חשבון המפרסם:** לפי סעיף 4.2.6, אפליקציה של עסק מסוים צריכה להתפרסם על ידי העסק עצמו. פרסום מחשבון פרטי של מפתח אחר עלול להידחות. ההמלצה: חשבון של הילה או של הסטודיו, וההעברה (App Transfer) אפשרית גם אחרי הפרסום.
3. **Android:** בשלב מאוחר יותר. דורש פרויקט Firebase חינמי בשביל התראות.

## 8. נקודות טכניות למי שממשיך בקוד

- **הוראות הפרויקט:** ב־`AGENTS.md` (Expo משתנה מהר, יש לבדוק את התיעוד של SDK 58).
- **מסד הנתונים:** כל הלוגיקה החשובה וההרשאות נמצאות ב־`supabase/migrations/0001`–`0004`. כולן כבר רצות בשרת.
- **אל תשנו בלי תיאום:** את `bundleIdentifier`, את `scheme` ואת `EXPO_PUBLIC_BUSINESS_SLUG`.
- **אתר:** גרסת ווב מתפרסמת ל־GitHub Pages (ענף `gh-pages`) עם `EXPO_BASE_URL=/torim`.
