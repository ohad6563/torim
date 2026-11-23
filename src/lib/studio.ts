/**
 * Legal and contact details of the studio, shown in the privacy policy and on the
 * account-deletion page. Fill in the empty fields before publishing to the stores.
 */
export const STUDIO = {
  /** Name as shown in the app and in the store listings. */
  name: process.env.EXPO_PUBLIC_STUDIO_NAME || 'הגבות של הילה',
  /** Legal name of the business owner (the "controller" of the data). */
  legalName: process.env.EXPO_PUBLIC_STUDIO_LEGAL_NAME || '',
  /** Business ID: עוסק מורשה / ח.פ. */
  businessId: process.env.EXPO_PUBLIC_STUDIO_BUSINESS_ID || '',
  address: process.env.EXPO_PUBLIC_STUDIO_ADDRESS || '',
  /** Email for privacy requests. */
  email: process.env.EXPO_PUBLIC_STUDIO_EMAIL || '',
  phone: process.env.EXPO_PUBLIC_STUDIO_PHONE || '',
  /** Free cancellation up to this many hours before the appointment (terms of use). */
  cancelHours: Number(process.env.EXPO_PUBLIC_STUDIO_CANCEL_HOURS) || 24,
  /** Optional extra no-show / late-cancellation policy, in the studio's own words. */
  noShowPolicy: process.env.EXPO_PUBLIC_STUDIO_NO_SHOW_POLICY || '',
  /** Accessibility coordinator (רכז/ת נגישות); defaults to the studio contact details. */
  accessibilityContact: process.env.EXPO_PUBLIC_STUDIO_ACCESSIBILITY_CONTACT || '',
};

/** One line with the operator's legal identity, for the legal pages. */
export function operatorLine() {
  return [STUDIO.legalName || STUDIO.name, STUDIO.businessId && `ע.מ./ח.פ. ${STUDIO.businessId}`, STUDIO.address]
    .filter(Boolean)
    .join(' · ');
}

/** Contact line (email · phone), or '' when not filled in yet. */
export function contactLine(formatPhone: (p: string) => string) {
  return [STUDIO.email, STUDIO.phone && formatPhone(STUDIO.phone)].filter(Boolean).join(' · ');
}

/** Last update of the terms / privacy texts (shown on the pages; bump when they change). */
export const LEGAL_UPDATED = 'נובמבר 2026';

/** Service providers that process data on the studio's behalf (named in the privacy policy). */
export const PROCESSORS = [
  { name: 'Supabase', role: 'אחסון מסד הנתונים וניהול ההתחברות (שרתים מחוץ לישראל)' },
  { name: 'Google / Apple', role: 'אימות זהות בכניסה עם חשבון Google או Apple' },
  { name: 'Expo', role: 'שליחת התראות ותזכורות לטלפון (שרתים מחוץ לישראל)' },
];
