import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Which of the given days have no free time at all for a service ("full"), plus the
 * first free slot across them. Days are checked in parallel; closed days are skipped.
 * Used to mark full days in the day strip and for "the next free time" on home.
 */
export function useAvailability(businessId: string | undefined, serviceId: string | null | undefined, days: string[], closed: Set<string>) {
  const open = days.filter((d) => !closed.has(d));
  const key = businessId && serviceId && open.length ? `${businessId}|${serviceId}|${open.join(',')}` : null;
  const [result, setResult] = useState<{ key: string; full: Set<string>; first: string | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    Promise.all(
      open.map((day) =>
        supabase
          .rpc('get_available_slots', { p_business_id: businessId, p_service_id: serviceId, p_day: day })
          .then(({ data, error }) => ({ day, slots: error ? null : ((data as string[] | null) ?? []) })),
      ),
    ).then((rows) => {
      if (cancelled) return;
      // A day whose request failed is unknown, not full.
      const full = new Set(rows.filter((r) => r.slots && r.slots.length === 0).map((r) => r.day));
      const first = rows.find((r) => r.slots && r.slots.length > 0)?.slots?.[0] ?? null;
      setResult({ key, full, first });
    });
    return () => {
      cancelled = true;
    };
    // `open` is captured through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = key && result?.key === key ? result : null;
  return { full: current?.full ?? EMPTY, first: current?.first ?? null, loading: !!key && !current };
}

const EMPTY = new Set<string>();
