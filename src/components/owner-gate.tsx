import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/**
 * Wraps an owner-only screen that lives outside the (owner) tab group, so it is
 * safe to open directly (deep link, browser refresh) before the business has loaded.
 */
export function withOwner<P extends object>(Screen: ComponentType<P>) {
  function Guarded(props: P) {
    const { loading, session, business } = useAuth();
    if (!session) return loading ? <Loading /> : <Redirect href="/welcome" />;
    if (!business) return loading ? <Loading /> : <Redirect href="/onboarding" />;
    return <Screen {...props} />;
  }
  Guarded.displayName = `withOwner(${Screen.displayName ?? Screen.name})`;
  return Guarded;
}
