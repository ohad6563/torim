import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/** Return address of the Google sign-in in the app; the session is set by the sign-in helper. */
export default function AuthCallback() {
  const { loading, session } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={session ? '/' : '/login'} />;
}
