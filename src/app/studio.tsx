import { withAccount } from '@/components/owner-gate';
import { BusinessHome } from '@/components/business-home';

const BUSINESS_SLUG = process.env.EXPO_PUBLIC_BUSINESS_SLUG || 'hila-brows';

/** Admin preview of the customer home. */
function StudioPreview() {
  return <BusinessHome slug={BUSINESS_SLUG} />;
}

export default withAccount(StudioPreview);
