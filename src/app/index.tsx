import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/** Entry point: sends each user to the right place. */
export default function Index() {
  const { loading, session, business } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (!business) return <Redirect href="/onboarding" />;
  return <Redirect href="/calendar" />;
}
