import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Session storage for Supabase. The native AsyncStorage module crashes the whole app
 * (an Objective-C exception on its own thread) if it is ever handed a non-string value,
 * e.g. `JSON.stringify(undefined)` from the auth library while switching accounts.
 * Only strings reach it; anything else removes the key instead.
 */
const safeStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: unknown) =>
    typeof value === 'string' ? AsyncStorage.setItem(key, value) : AsyncStorage.removeItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

/** False until the Supabase keys are set in `.env.local`. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-key',
  {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      // PKCE: the Google sign-in returns a one-time code that is exchanged for a session.
      flowType: 'pkce',
    },
  },
);

// On mobile, only refresh the session while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
