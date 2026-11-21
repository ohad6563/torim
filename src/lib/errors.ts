/** Turns Supabase / database errors into a Hebrew message for the user. */
export function errorMessage(err: unknown): string {
  const msg =
    typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);

  const known: [RegExp, string][] = [
    [/SLOT_TAKEN|appointments_no_overlap/, 'השעה הזו כבר תפוסה. בחרו שעה אחרת.'],
    [/INVALID_PHONE/, 'מספר הטלפון לא תקין.'],
    [/INVALID_NAME/, 'נא להזין שם מלא.'],
    [/SERVICE_NOT_FOUND/, 'השירות לא זמין יותר.'],
    [/BUSINESS_NOT_FOUND/, 'העסק לא נמצא.'],
    [/NOT_ALLOWED/, 'אין הרשאה לפעולה הזו.'],
    [/NOT_SIGNED_IN/, 'צריך להתחבר כדי לקבוע תור.'],
    [/TOO_MANY_BOOKINGS/, 'אפשר להחזיק עד 3 תורים עתידיים. לתור נוסף בטלו אחד קיים או צרו קשר עם הסטודיו.'],
    [/NOTE_TOO_LONG|appointments_notes_len/, 'ההערה ארוכה מדי.'],
    [/PHONE_NOT_VERIFIED/, 'צריך להתחבר עם מספר טלפון מאומת כדי לקבוע תור.'],
    [/Token has expired or is invalid|otp_expired|invalid.*otp/i, 'הקוד שגוי או שפג תוקפו. נסו שוב או בקשו קוד חדש.'],
    [/Unsupported phone provider|phone_provider_disabled|SMS.*(provider|disabled)/i, 'שליחת קודים ב־SMS עדיין לא הופעלה במערכת.'],
    [/you can only request this after (\d+) seconds/i, 'אפשר לבקש קוד חדש בעוד כמה שניות.'],
    [/Invalid phone|phone.*invalid/i, 'מספר הטלפון לא תקין.'],
    [/INVALID_RANGE/, 'טווח התאריכים או השעות לא תקין.'],
    [/businesses_slug_key|duplicate key.*slug/, 'הכתובת הזו כבר תפוסה. נסו כתובת אחרת.'],
    [/customers_business_id_phone_key/, 'כבר קיים לקוח עם מספר הטלפון הזה.'],
    [/Invalid login credentials/, 'פרטי הכניסה שגויים.'],
    [/User already registered|already been registered/, 'כבר קיים חשבון עם הפרטים האלה.'],
    [/Email not confirmed/, 'צריך לאשר את האימייל. בדקו את תיבת הדואר.'],
    [/Password should be at least/, 'הסיסמה צריכה להכיל לפחות 6 תווים.'],
    [/Unable to validate email|invalid format/i, 'כתובת האימייל לא תקינה.'],
    [/rate limit/i, 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'],
    [/Failed to fetch|Network request failed/i, 'אין חיבור לשרת. בדקו את החיבור לאינטרנט.'],
  ];
  for (const [re, text] of known) if (re.test(msg)) return text;
  return 'משהו השתבש. נסו שוב.';
}
