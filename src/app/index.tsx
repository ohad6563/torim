import { Redirect } from 'expo-router';

import { BusinessHome } from '@/components/business-home';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';

/**
 * When the app is built for one studio (EXPO_PUBLIC_BUSINESS_SLUG), customers land
 * straight on that studio's home and the owner signs in from a quiet link at the bottom.
 * Without it, the app is the general version for business owners.
 */
const BUSINESS_SLUG = process.env.EXPO_PUBLIC_BUSINESS_SLUG;

export default function Index() {
  const { loading, session, business } = useAuth();
  if (loading) return <Loading />;
  if (session && business) return <Redirect href="/calendar" />;
  if (session && !business) return <Redirect href="/onboarding" />;
  if (BUSINESS_SLUG) return <BusinessHome slug={BUSINESS_SLUG} showOwnerEntry />;
  return <Redirect href="/welcome" />;
}
