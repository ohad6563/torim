/**
 * Accounts sign in with an email or a username. Supabase Auth needs an email,
 * so a username maps to a private address on the app's own domain.
 */
const USERNAME_DOMAIN = 'users.hila-brows.app';

export const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

export function isEmail(input: string) {
  return /^\S+@\S+\.\S+$/.test(input.trim());
}

/** "ohad1234" -> "ohad1234@users.hila-brows.app"; emails are returned as-is. */
export function loginEmail(input: string): string {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${USERNAME_DOMAIN}`;
}

/** The username part, if the input is a username (not an email). */
export function usernameOf(input: string): string | null {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? null : v;
}
