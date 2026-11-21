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
};

/** Service providers that process data on the studio's behalf (named in the privacy policy). */
export const PROCESSORS = [
  { name: 'Supabase', role: 'אחסון מסד הנתונים וניהול ההתחברות (שרתים מחוץ לישראל)' },
  { name: 'Google / Apple', role: 'אימות זהות בכניסה עם חשבון Google או Apple' },
];
