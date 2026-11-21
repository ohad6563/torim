import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/**
 * Wraps an admin-only screen that lives outside the (owner) tab group, so it is
 * safe to open directly (deep link, browser refresh) and closed to customers.
 */
export function withOwner<P extends object>(Screen: ComponentType<P>) {
  function Guarded(props: P) {
    const { loading, session, business } = useAuth();
    if (loading) return <Loading />;
    if (!session) return <Redirect href="/login" />;
    if (!business) return <Redirect href="/" />;
    return <Screen {...props} />;
  }
  Guarded.displayName = `withOwner(${Screen.displayName ?? Screen.name})`;
  return Guarded;
}

/** Wraps a screen that needs any signed-in account (customer or admin). */
export function withAccount<P extends object>(Screen: ComponentType<P>) {
  function Guarded(props: P) {
    const { loading, session } = useAuth();
    if (loading) return <Loading />;
    if (!session) return <Redirect href="/login" />;
    return <Screen {...props} />;
  }
  Guarded.displayName = `withAccount(${Screen.displayName ?? Screen.name})`;
  return Guarded;
}
