import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type Result = { key: string; slots: string[] };

/** Free start times (ISO timestamps) for a service on a local day. */
export function useSlots(businessId: string | undefined, serviceId: string | null, day: string, refreshKey = 0) {
  const key = businessId && serviceId && day ? `${businessId}|${serviceId}|${day}|${refreshKey}` : null;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    supabase
      .rpc('get_available_slots', { p_business_id: businessId, p_service_id: serviceId, p_day: day })
      .then(({ data, error }) => {
        // Supabase returns `setof timestamptz` as an array of strings.
        if (!cancelled) setResult({ key, slots: error ? [] : ((data as string[] | null) ?? []) });
      });
    return () => {
      cancelled = true;
    };
  }, [key, businessId, serviceId, day]);

  if (!key) return { slots: null, loading: false };
  const current = result?.key === key ? result.slots : null;
  return { slots: current, loading: current === null };
}
