import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/**
 * Entry point. Everyone signs in first (phone + SMS code); new customers then
 * give their name once. Admins get the management area, everyone else the customer app.
 */
export default function Index() {
  const { loading, session, isAdmin, profile } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (isAdmin) return <Redirect href="/calendar" />;
  if (!profile?.full_name) return <Redirect href="/complete-profile" />;
  return <Redirect href="/home" />;
}
