import { useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Business, Service, WorkingHours } from '@/lib/types';

/** The columns the public may read (internal ones like owner_id are not granted). */
export const PUBLIC_BUSINESS_COLUMNS =
  'id,name,slug,category,phone,address,description,timezone,slot_interval_min,min_notice_min,max_days_ahead';

export type PublicBusiness = {
  business: Business;
  services: Service[];
  hours: WorkingHours[];
};

/** Public profile of a business (what customers see), loaded by its link slug. */
export function usePublicBusiness(slug: string | undefined) {
  const [data, setData] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: b, error: bErr } = await supabase
        .from('businesses')
        .select(PUBLIC_BUSINESS_COLUMNS)
        .eq('slug', slug.toLowerCase())
        .maybeSingle();
      if (bErr) {
        if (!cancelled) {
          setError(errorMessage(bErr));
          setLoading(false);
        }
        return;
      }
      if (b) {
        const [s, h] = await Promise.all([
          supabase
            .from('services')
            .select('*')
            .eq('business_id', b.id)
            .eq('is_active', true)
            .order('sort_order')
            .order('created_at'),
          supabase.from('working_hours').select('*').eq('business_id', b.id).order('start_time'),
        ]);
        if (!cancelled) {
          setData({
            business: b as Business,
            services: (s.data ?? []) as Service[],
            hours: (h.data ?? []) as WorkingHours[],
          });
        }
      }
      if (!cancelled) {
        setError(null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  const retry = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };
  return { data, loading, error, retry };
}
