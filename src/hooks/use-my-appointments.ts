import { useFocusData } from '@/hooks/use-focus-data';
import { supabase } from '@/lib/supabase';
import type { MyAppointment } from '@/lib/types';

/** The signed-in customer's appointments, split into upcoming and past. Refreshes on focus. */
export function useMyAppointments(slug?: string) {
  const q = useFocusData(async () => {
    const { data, error } = await supabase.rpc('my_appointments');
    if (error) throw error;
    const all = ((data ?? []) as MyAppointment[]).filter((a) => !slug || a.business_slug === slug);
    const now = Date.now();
    const upcoming = all
      .filter((a) => a.status === 'booked' && new Date(a.ends_at).getTime() > now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const past = all.filter((a) => !upcoming.includes(a));
    return { upcoming, past };
  }, [slug]);
  return { ...q, upcoming: q.data?.upcoming ?? [], past: q.data?.past ?? [] };
}
