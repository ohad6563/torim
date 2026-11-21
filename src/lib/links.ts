import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

/**
 * Public web address of the app, used for links sent to customers (booking page,
 * "my appointment" page). Set EXPO_PUBLIC_APP_URL once the web app is deployed.
 */
function baseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return Linking.createURL('').replace(/\/$/, '');
}

export const bookingUrl = (slug: string) => `${baseUrl()}/b/${slug}`;
export const appointmentUrl = (token: string) => `${baseUrl()}/a/${token}`;

/** Share sheet on mobile, clipboard copy on web. Returns true if copied to clipboard. */
export async function shareLink(url: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      try {
        await navigator.share({ text: message, url });
        return false;
      } catch {
        // cancelled or unsupported — fall through to copying
      }
    }
    await navigator.clipboard?.writeText(url);
    return true;
  }
  await Share.share({ message: `${message}\n${url}` });
  return false;
}

/** Opens WhatsApp with a pre-filled message to an Israeli phone number. */
export function whatsappUrl(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? '972' + digits.slice(1) : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
