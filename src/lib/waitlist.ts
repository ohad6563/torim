import { supabase } from '@/lib/supabase';

export type DayPart = 'any' | 'morning' | 'noon' | 'evening';

export const DAY_PARTS: { key: DayPart; label: string }[] = [
  { key: 'any', label: 'כל היום' },
  { key: 'morning', label: 'בוקר' },
  { key: 'noon', label: 'צהריים' },
  { key: 'evening', label: 'ערב' },
];

export const partLabel = (p: string) => DAY_PARTS.find((d) => d.key === p)?.label ?? 'כל היום';

/** The customer's own active waitlist entries (from `my_waitlist`). */
export type MyWaitlistEntry = {
  id: string;
  business_id: string;
  service_id: string | null;
  service_name: string;
  day: string; // YYYY-MM-DD
  part: DayPart;
  note: string | null;
  last_notified_at: string | null;
  created_at: string;
};

/** What the studio sees (from `business_waitlist`). */
export type StudioWaitlistEntry = Omit<MyWaitlistEntry, 'business_id'> & {
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
};

export async function fetchMyWaitlist() {
  const { data, error } = await supabase.rpc('my_waitlist');
  if (error) throw error;
  return (data ?? []) as MyWaitlistEntry[];
}

export async function joinWaitlist(args: { businessId: string; serviceId: string; day: string; part: DayPart; note?: string }) {
  const { error } = await supabase.rpc('join_waitlist', {
    p_business_id: args.businessId,
    p_service_id: args.serviceId,
    p_day: args.day,
    p_part: args.part,
    p_note: args.note ?? null,
  });
  if (error) throw error;
}

export async function leaveWaitlist(id: string) {
  const { error } = await supabase.rpc('leave_waitlist', { p_id: id });
  if (error) throw error;
}

export async function fetchStudioWaitlist() {
  const { data, error } = await supabase.rpc('business_waitlist');
  if (error) throw error;
  return (data ?? []) as StudioWaitlistEntry[];
}

export async function setWaitlistStatus(id: string, status: 'handled' | 'cancelled' | 'waiting') {
  const { error } = await supabase.rpc('set_waitlist_status', { p_id: id, p_status: status });
  if (error) throw error;
}
