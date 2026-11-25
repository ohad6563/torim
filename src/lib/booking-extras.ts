/** Small helpers for the booking confirmation: calendar link and prep tips per treatment. */

const pad = (n: number) => String(n).padStart(2, '0');
const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

/** "Add to calendar" link (Google Calendar template; opens in the browser or the Google Calendar app). */
export function calendarUrl({ title, start, minutes, location }: { title: string; start: string; minutes: number; location: string | null }) {
  const s = new Date(start);
  const e = new Date(s.getTime() + minutes * 60_000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${utcStamp(s)}/${utcStamp(e)}` });
  if (location) q.set('location', location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Short, practical prep notes, matched by a keyword in the service name. */
export function prepTips(serviceName: string): string[] {
  if (serviceName.includes('מיקרו'))
    return ['24 שעות לפני: בלי אלכוהול, קפה בכמות גדולה או תרופות מדללות דם', 'לא למרוט או לצבוע את הגבות שבועיים לפני', 'כדאי להגיע בלי איפור באזור הגבות'];
  if (serviceName.includes('ריסים')) return ['להגיע בלי מסקרה ובלי עדשות מגע', 'לא להרטיב את הריסים 24 שעות אחרי הטיפול'];
  if (serviceName.includes('צביעת')) return ['כדאי להגיע בלי איפור באזור הגבות', 'אם יש רגישות לצבע, ספרי לנו מראש'];
  if (serviceName.includes('עיצוב')) return ['לא למרוט שבוע לפני, כדי שיהיה עם מה לעבוד', 'כדאי להגיע בלי איפור באזור הגבות'];
  return [];
}
