import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { errorMessage } from '@/lib/errors';
import { unregisterPush } from '@/lib/push';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Business, Profile } from '@/lib/types';

type AuthState = {
  /** True until the stored session, profile and managed business have been loaded. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** The business this account manages (owner or admin). Null for customers. */
  business: Business | null;
  isAdmin: boolean;
  /** Set when the account details couldn't be loaded (e.g. no network). */
  accountError: string | null;
  refresh: () => Promise<void>;
  /** @deprecated use refresh */
  refreshBusiness: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [accountError, setAccountError] = useState<string | null>(null);
  const loadedUserRef = useRef<string | null | undefined>(undefined);

  const loadAccount = useCallback(async (s: Session | null) => {
    if (!s) {
      setBusiness(null);
      setProfile(null);
      setAccountError(null);
      return;
    }
    setLoading(true);
    try {
      const [biz, prof] = await Promise.all([
        supabase.rpc('my_business'),
        supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      ]);
      // On failure keep what we had: never demote an admin or "lose" a name because of a network error.
      if (biz.error || prof.error) {
        setAccountError(errorMessage(biz.error ?? prof.error));
        return;
      }
      const rows = (biz.data ?? []) as Business[];
      setBusiness(rows[0] ?? null);
      setProfile((prof.data as Profile | null) ?? null);
      setAccountError(null);
    } catch (e) {
      setAccountError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        loadedUserRef.current = data.session?.user.id ?? null;
        setSession(data.session);
        await loadAccount(data.session);
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const userId = s?.user.id ?? null;
      // Supabase re-emits SIGNED_IN for the same user (e.g. when a browser tab regains focus).
      if (userId === loadedUserRef.current) return;
      loadedUserRef.current = userId;
      if (s) setLoading(true);
      // Avoid calling Supabase synchronously inside the auth callback (it can deadlock).
      setTimeout(() => loadAccount(s), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      business,
      isAdmin: business !== null,
      accountError,
      refresh: () => loadAccount(session),
      refreshBusiness: () => loadAccount(session),
      signOut: async () => {
        // Stop reminders to this device for this account, then clear the session
        // ('local' always clears this device's session, even offline).
        await unregisterPush();
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setBusiness(null);
        setProfile(null);
        setAccountError(null);
      },
    }),
    [loading, session, profile, business, accountError, loadAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens inside the admin area, where a business is guaranteed to exist. */
export function useBusiness(): Business {
  const { business } = useAuth();
  if (!business) throw new Error('useBusiness used without a business');
  return business;
}
