import { Redirect } from 'expo-router';

/** Sign-up and sign-in are the same phone-code flow now. */
export default function Signup() {
  return <Redirect href="/login" />;
}
