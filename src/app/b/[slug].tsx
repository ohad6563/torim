import { useLocalSearchParams } from 'expo-router';

import { BusinessHome } from '@/components/business-home';

/** Public page of a business, opened from its shared link. */
export default function BusinessPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <BusinessHome slug={String(slug)} />;
}
