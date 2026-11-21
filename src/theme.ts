import { Platform } from 'react-native';

export const colors = {
  primary: '#8E3B6B', // deep plum
  primaryDark: '#6E2B52',
  primarySoft: '#F6E8F0',
  accent: '#D9A05B',
  background: '#FBF8F6',
  surface: '#FFFFFF',
  border: '#ECE4E0',
  text: '#2B2228',
  textMuted: '#7A6E74',
  textOnPrimary: '#FFFFFF',
  success: '#2F8F5B',
  successSoft: '#E5F4EC',
  danger: '#C23B3B',
  dangerSoft: '#FBEAEA',
  warningSoft: '#FDF3E3',
  overlay: 'rgba(30, 20, 26, 0.45)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 14,
  tiny: 12,
} as const;

/** Content never grows wider than this on tablets / desktop browsers. */
export const MAX_WIDTH = 640;

export const shadow = Platform.select({
  web: { boxShadow: '0 2px 10px rgba(60, 30, 50, 0.06)' },
  default: {
    shadowColor: '#3C1E32',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
