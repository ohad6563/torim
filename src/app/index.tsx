import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/**
 * Entry point. Everyone signs in first; then admins (studio owner and accounts
 * with admin rights) get the management area and everyone else the customer app.
 */
export default function Index() {
  const { loading, session, isAdmin } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  return <Redirect href={isAdmin ? '/calendar' : '/home'} />;
}
