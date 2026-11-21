import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Customers don't have accounts, so the private links (tokens) of appointments
 * booked on this device are remembered locally to show "my appointments".
 */
const KEY = 'my-appointment-tokens';

export async function getMyTokens(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export async function addMyToken(token: string) {
  const list = await getMyTokens();
  if (!list.includes(token)) {
    await AsyncStorage.setItem(KEY, JSON.stringify([token, ...list].slice(0, 30))).catch(() => {});
  }
}

export async function removeMyToken(token: string) {
  const list = await getMyTokens();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((t) => t !== token))).catch(() => {});
}
