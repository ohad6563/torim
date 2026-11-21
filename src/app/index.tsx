import { Redirect } from 'expo-router';

import { AccountError } from '@/components/account-error';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/**
 * Entry point. Everyone signs in first (Google / Apple); new customers then
 * add their name and phone once. Admins get the management area, everyone else the customer app.
 */
export default function Index() {
  const { loading, session, isAdmin, profile, accountError } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (isAdmin) return <Redirect href="/calendar" />;
  // Couldn't load the account: don't guess (e.g. send an admin to the customer app).
  if (accountError && !profile) return <AccountError />;
  if (!profile?.full_name || !profile?.phone) return <Redirect href="/complete-profile" />;
  return <Redirect href="/home" />;
}
