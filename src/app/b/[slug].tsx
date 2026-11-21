import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/** Shared studio link. The app is the studio's own, so it simply opens the app (after sign-in). */
export default function BusinessLink() {
  const { loading, session } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={session ? '/' : '/login'} />;
}
