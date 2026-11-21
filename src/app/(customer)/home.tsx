import { BusinessHome } from '@/components/business-home';

const BUSINESS_SLUG = process.env.EXPO_PUBLIC_BUSINESS_SLUG || 'hila-brows';

/** Customer home: the studio's page. */
export default function Home() {
  return <BusinessHome slug={BUSINESS_SLUG} />;
}
