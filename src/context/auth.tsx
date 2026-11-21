import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Business } from '@/lib/types';

type AuthState = {
  /** True until the stored session (and the owner's business) have been loaded. */
  loading: boolean;
  session: Session | null;
  business: Business | null;
  refreshBusiness: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const loadedUserRef = useRef<string | null | undefined>(undefined);

  const loadBusiness = useCallback(async (s: Session | null) => {
    if (!s) {
      setBusiness(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase.from('businesses').select('*').eq('owner_id', s.user.id).maybeSingle();
      setBusiness((data as Business | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      loadedUserRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      await loadBusiness(data.session);
      if (active) setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      const userId = s?.user.id ?? null;
      // Supabase re-emits SIGNED_IN for the same user (e.g. when a browser tab regains focus).
      if (userId === loadedUserRef.current) return;
      loadedUserRef.current = userId;
      if (s) setLoading(true);
      // Avoid calling Supabase synchronously inside the auth callback (it can deadlock).
      setTimeout(() => loadBusiness(s), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadBusiness]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      business,
      refreshBusiness: () => loadBusiness(session),
      signOut: async () => {
        await supabase.auth.signOut();
        setBusiness(null);
      },
    }),
    [loading, session, business, loadBusiness],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens inside the owner area, where a business is guaranteed to exist. */
export function useBusiness(): Business {
  const { business } = useAuth();
  if (!business) throw new Error('useBusiness used without a business');
  return business;
}
