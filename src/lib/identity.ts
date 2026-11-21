import { isValidPhone, normalizePhone } from '@/lib/dates';

/**
 * Sign-in is by Israeli mobile number. Supabase Auth expects international
 * format: "054-123-4567" -> "+972541234567".
 */
export function toE164(phone: string): string {
  return '+972' + normalizePhone(phone).slice(1);
}

/** Israeli mobile numbers only (05X-XXXXXXX): SMS codes can't reach landlines. */
export function isMobile(phone: string): boolean {
  return isValidPhone(phone) && /^05\d{8}$/.test(normalizePhone(phone));
}
