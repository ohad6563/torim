import { useFocusData } from '@/hooks/use-focus-data';
import { fetchMyWaitlist } from '@/lib/waitlist';

/** The signed-in customer's active waitlist entries. Refreshes on focus. */
export function useMyWaitlist() {
  const q = useFocusData(fetchMyWaitlist, []);
  return { ...q, entries: q.data ?? [] };
}
