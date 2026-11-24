/**
 * Date helpers. Local calendar days are handled as "YYYY-MM-DD" strings in the
 * business timezone, so the app behaves the same whatever the device timezone is.
 */

export const DEFAULT_TZ = 'Asia/Jerusalem';

export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const WEEKDAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function parts(date: Date, tz: string) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

/** Today's date in the given timezone, as "YYYY-MM-DD". */
export function todayIn(tz = DEFAULT_TZ): string {
  return dayOf(new Date().toISOString(), tz);
}

/** The local day of an ISO timestamp, as "YYYY-MM-DD". */
export function dayOf(iso: string, tz = DEFAULT_TZ): string {
  const p = parts(new Date(iso), tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "HH:MM" of an ISO timestamp in the given timezone. */
export function timeOf(iso: string, tz = DEFAULT_TZ): string {
  const p = parts(new Date(iso), tz);
  return `${p.hour}:${p.minute}`;
}

function toUTC(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: string, n: number): string {
  const d = toUTC(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(day: string): number {
  return toUTC(day).getUTCDay();
}

export function dayNumber(day: string): number {
  return Number(day.slice(8, 10));
}

/** e.g. "יום שלישי, 24 בנובמבר" */
export function formatDayLong(day: string): string {
  const d = toUTC(day);
  return `יום ${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ב${MONTHS[d.getUTCMonth()]}`;
}

/** e.g. "24.11" */
export function formatDayShort(day: string): string {
  return `${dayNumber(day)}.${Number(day.slice(5, 7))}`;
}

export function monthName(day: string): string {
  return MONTHS[Number(day.slice(5, 7)) - 1];
}

/** "HH:MM:SS" -> "HH:MM" */
export function trimTime(t: string): string {
  return t.slice(0, 5);
}

/** Strict "HH:MM" check (00:00 - 23:59). */
export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hours = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`;
  return m ? `${hours} ו־${m} דק׳` : hours;
}

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '';
  return `₪${Number(price).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
}

/** Normalise an Israeli phone number to digits, e.g. "+972 54-123-4567" -> "0541234567". */
export function normalizePhone(p: string | null | undefined): string {
  const digits = (p ?? '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+972')) return '0' + digits.slice(4);
  if (digits.startsWith('972')) return '0' + digits.slice(3);
  return digits;
}

export function isValidPhone(p: string): boolean {
  return /^0\d{8,9}$/.test(normalizePhone(p));
}

/** "0541234567" -> "054-123-4567" */
/** Display form of a phone number; '' when there is none (e.g. a deleted account). */
export function formatPhone(p: string | null | undefined): string {
  if (!p) return '';
  const n = normalizePhone(p);
  if (/^05\d{8}$/.test(n)) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  if (/^0\d{8}$/.test(n)) return `${n.slice(0, 2)}-${n.slice(2, 5)}-${n.slice(5)}`;
  return p;
}

/**
 * A time range like "09:00–19:00", isolated as left-to-right so Hebrew (RTL)
 * text around it doesn't flip it into "19:00–09:00".
 */
export function timeRange(start: string, end: string): string {
  return `⁦${trimTime(start)}–${trimTime(end)}⁩`;
}
