export const CATEGORIES = ['מספרה', 'קוסמטיקה', 'גבות וריסים', 'ציפורניים', 'עיסוי וטיפולים', 'אחר'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Suggested starter services per category; the owner can edit or delete them later. */
export const DEFAULT_SERVICES: Record<Category, { name: string; duration_min: number; price: number }[]> = {
  מספרה: [
    { name: 'תספורת גברים', duration_min: 30, price: 80 },
    { name: 'תספורת נשים', duration_min: 45, price: 150 },
    { name: 'צבע שורש', duration_min: 90, price: 250 },
    { name: 'פן', duration_min: 30, price: 100 },
  ],
  קוסמטיקה: [
    { name: 'טיפול פנים קלאסי', duration_min: 60, price: 250 },
    { name: 'ניקוי עמוק', duration_min: 75, price: 300 },
    { name: 'הסרת שיער בשעווה', duration_min: 30, price: 120 },
  ],
  'גבות וריסים': [
    { name: 'עיצוב גבות', duration_min: 20, price: 60 },
    { name: 'הרמת ריסים', duration_min: 60, price: 200 },
    { name: 'צביעת גבות', duration_min: 20, price: 50 },
  ],
  ציפורניים: [
    { name: 'מניקור', duration_min: 45, price: 100 },
    { name: 'לק ג׳ל', duration_min: 60, price: 140 },
    { name: 'פדיקור', duration_min: 60, price: 150 },
  ],
  'עיסוי וטיפולים': [
    { name: 'עיסוי שוודי', duration_min: 60, price: 280 },
    { name: 'עיסוי רקמות עמוק', duration_min: 60, price: 320 },
  ],
  אחר: [{ name: 'פגישה', duration_min: 30, price: 100 }],
};

/** Sunday–Thursday 09:00–19:00, Friday 08:00–14:00. */
export const DEFAULT_HOURS = [
  ...[0, 1, 2, 3, 4].map((weekday) => ({ weekday, start_time: '09:00', end_time: '19:00' })),
  { weekday: 5, start_time: '08:00', end_time: '14:00' },
];

/** Public booking-link slug: lowercase English letters, digits and dashes. */
export function isValidSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]{2,39}$/.test(slug);
}

export function cleanSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 40);
}
