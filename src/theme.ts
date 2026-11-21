import { Platform } from 'react-native';

/**
 * Matte monochrome palette. Everything is black, white and greys; the only
 * colours are the quiet status tints (confirmed / cancelled).
 */
export const colors = {
  background: '#0A0A0A',
  surface: '#141414',
  surfaceRaised: '#1B1B1B',
  border: '#262626',
  borderStrong: '#3A3A3A',

  text: '#F4F4F2',
  textMuted: '#8E8E8A',
  textFaint: '#5C5C59',

  // "Primary" is ink-white: white buttons with black text.
  primary: '#F4F4F2',
  primaryDark: '#D9D9D6',
  primarySoft: '#1E1E1E',
  textOnPrimary: '#0A0A0A',
  accent: '#F4F4F2',

  success: '#A8D5B4',
  successSoft: '#16211A',
  danger: '#F0A0A0',
  dangerSoft: '#261616',
  warning: '#E6C98F',
  warningSoft: '#26200F',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;

export const font = {
  display: 44,
  h1: 30,
  h2: 23,
  h3: 18,
  body: 16,
  small: 14,
  tiny: 12,
} as const;

/** Heebo in every weight we use. Custom fonts need one family per weight on native. */
export const family = {
  light: 'Heebo_300Light',
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  semibold: 'Heebo_600SemiBold',
  bold: 'Heebo_700Bold',
  black: 'Heebo_800ExtraBold',
} as const;

/** Content never grows wider than this on tablets / desktop browsers. */
export const MAX_WIDTH = 640;

/** Soft lift for raised surfaces. Kept subtle: matte, not glossy. */
export const shadow = Platform.select({
  web: { boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(0,0,0,0.35)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});

/** Spring presets shared by every animation, so motion feels like one system. */
export const springs = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  gentle: { damping: 20, stiffness: 160 },
  bouncy: { damping: 12, stiffness: 180 },
} as const;
