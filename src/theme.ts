import { Platform } from 'react-native';

type Palette = {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Main action colour (buttons, selected day/time). */
  primary: string;
  primaryDark: string;
  primarySoft: string;
  textOnPrimary: string;
  /** Brand highlight: the logo strokes and small details. */
  accent: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  overlay: string;
};

/**
 * Colour palettes. They share one structure, so switching palette restyles the
 * whole app. Pick one with EXPO_PUBLIC_THEME (default: "porcelain", the studio's choice).
 *
 * Built on the studio's black-and-white identity: a near-black (never pure #000,
 * which looks harsh on OLED) with warm off-white text, one accent colour at most,
 * and 60-30-10 proportions (background / surfaces / accent).
 */
export const palettes = {
  /** Matte black and white. Pure, graphic, gallery-like. */
  mono: {
    isDark: true,
    background: '#0A0A0A',
    surface: '#141414',
    surfaceRaised: '#1B1B1B',
    border: '#262626',
    borderStrong: '#3A3A3A',
    text: '#F4F4F2',
    textMuted: '#8E8E8A',
    textFaint: '#5C5C59',
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
  },
  /** Black with champagne gold. Luxury, "precision" — the classic premium beauty pairing. */
  gold: {
    isDark: true,
    background: '#0B0A09',
    surface: '#151311',
    surfaceRaised: '#1D1A17',
    border: '#2A2622',
    borderStrong: '#3D3730',
    text: '#F3EEE6',
    textMuted: '#9A9286',
    textFaint: '#625B52',
    primary: '#C9A96E',
    primaryDark: '#B3925A',
    primarySoft: '#221D15',
    textOnPrimary: '#0B0A09',
    accent: '#C9A96E',
    success: '#A8D5B4',
    successSoft: '#16211A',
    danger: '#F0A0A0',
    dangerSoft: '#261616',
    warning: '#E6C98F',
    warningSoft: '#26200F',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  /** Warm black with soft nude/blush. Feminine and skin-toned without being "pink". */
  nude: {
    isDark: true,
    background: '#100D0C',
    surface: '#1A1615',
    surfaceRaised: '#221D1B',
    border: '#2E2725',
    borderStrong: '#433936',
    text: '#F5EDE8',
    textMuted: '#A3938C',
    textFaint: '#6A5D58',
    primary: '#E3C2B4',
    primaryDark: '#D4AE9E',
    primarySoft: '#2A211E',
    textOnPrimary: '#100D0C',
    accent: '#E3C2B4',
    success: '#A8D5B4',
    successSoft: '#16211A',
    danger: '#F0A0A0',
    dangerSoft: '#2A1716',
    warning: '#E6C98F',
    warningSoft: '#26200F',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  /** Porcelain: warm off-white with black ink. Airy, clean, like a white studio. */
  porcelain: {
    isDark: false,
    background: '#F5F3EF',
    surface: '#FFFFFF',
    surfaceRaised: '#EFECE7',
    border: '#E4E0DA',
    borderStrong: '#CFCAC2',
    text: '#141210',
    textMuted: '#6F6A64',
    textFaint: '#736D67', // 4.6:1 on the background (WCAG AA for small text)
    primary: '#141210',
    primaryDark: '#000000',
    primarySoft: '#EFECE7',
    textOnPrimary: '#F5F3EF',
    accent: '#141210',
    success: '#2F7A4D',
    successSoft: '#E3F1E8',
    danger: '#B83A3A',
    dangerSoft: '#F7E4E4',
    warning: '#9A6A12',
    warningSoft: '#F7EEDB',
    overlay: 'rgba(20, 18, 16, 0.4)',
  },
} satisfies Record<string, Palette>;

export type ThemeName = keyof typeof palettes;

const requested = process.env.EXPO_PUBLIC_THEME as ThemeName | undefined;
export const themeName: ThemeName = requested && requested in palettes ? requested : 'porcelain';

export const colors: Palette = palettes[themeName];

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
  // (kept subtle in every palette)
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
