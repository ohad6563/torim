import { router, type Href } from 'expo-router';

/**
 * Go back, or — when the screen was opened directly (deep link, browser refresh)
 * and there is no history — go to a sensible parent screen instead.
 */
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/** Only allow in-app paths as a post-login destination (no open redirects). */
export function safeNext(next: unknown): string | null {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.includes('://')
    ? next
    : null;
}
