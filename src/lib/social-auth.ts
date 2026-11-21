import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type SignInResult = { ok: true } | { ok: false; cancelled?: boolean; error?: unknown };

/** Where Google sends the user back to after signing in. */
function redirectUrl(next?: string | null) {
  if (Platform.OS === 'web') {
    // The web build may live under a sub-path (e.g. /torim on GitHub Pages).
    const base = `${window.location.origin}${Constants.expoConfig?.experiments?.baseUrl ?? ''}`;
    return next ? `${base}${next}` : `${base}/`;
  }
  return Linking.createURL('auth-callback');
}

/**
 * Sign in with Google (free, via Supabase). On the web the page redirects to Google
 * and back; in the app a secure browser sheet opens and returns a one-time code.
 */
export async function signInWithGoogle(next?: string | null): Promise<SignInResult> {
  const redirectTo = redirectUrl(next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) return { ok: false, error };
  if (Platform.OS === 'web') return { ok: true }; // the browser is navigating to Google

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { ok: false, cancelled: true };
  const code = new URL(result.url).searchParams.get('code');
  if (!code) return { ok: false, error: new Error('missing code') };
  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
  return exErr ? { ok: false, error: exErr } : { ok: true };
}

/** Native "Sign in with Apple" is available on iPhone/iPad only. */
export async function isAppleSignInAvailable() {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync().catch(() => false));
}

/**
 * Sign in with Apple (iOS, native sheet). Apple shares the name only on the very
 * first sign-in, so it is saved to the profile right away.
 */
export async function signInWithApple(): Promise<SignInResult> {
  try {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) return { ok: false, error: new Error('no identity token') };
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) return { ok: false, error };
    const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim();
    if (name && data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, full_name: name });
    }
    return { ok: true };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return { ok: false, cancelled: true };
    return { ok: false, error: e };
  }
}
