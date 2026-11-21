import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: b } = await supabase
        .from('businesses')
        .select(PUBLIC_BUSINESS_COLUMNS)
        .eq('slug', slug.toLowerCase())
        .maybeSingle();
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
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { data, loading };
}
