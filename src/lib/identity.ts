import { isValidPhone, normalizePhone } from '@/lib/dates';

/** Israeli mobile numbers (05X-XXXXXXX): the studio contacts customers by phone / WhatsApp. */
export function isMobile(phone: string): boolean {
  return isValidPhone(phone) && /^05\d{8}$/.test(normalizePhone(phone));
}
