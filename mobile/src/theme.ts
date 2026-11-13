import type { TextStyle } from 'react-native';
import {DUO_CHROME} from './duo-layout';

// Verified TDS foundation values; layout dimensions below are Duck choices.
// See docs/tds-analysis.md. Native text scaling remains enabled.
export const palette = {
  white: '#ffffff', grey50: '#f9fafb', grey100: '#f2f4f6', grey200: '#e5e8eb',
  grey300: '#d1d6db', grey400: '#b0b8c1', grey500: '#8b95a1', grey600: '#6b7684',
  grey700: '#4e5968', grey800: '#333d4b', grey900: '#191f28',
  blue50: '#e8f3ff', blue500: '#3182f6', blue700: '#1b64da',
  red500: '#f04452',
} as const;
export const colors = {
  bg: palette.white, surface: palette.grey50, grouped: palette.grey100,
  text: palette.grey900, secondary: palette.grey700, muted: palette.grey600,
  subtle: palette.grey500, blue: palette.blue500, action: palette.blue700, blueText: palette.blue700,
  line: palette.grey200, pale: palette.blue50, white: palette.white,
  danger: palette.red500,
} as const;
export const typography = {
  title: { fontSize: 30, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  heading: { fontSize: 26, lineHeight: 35, fontWeight: '700', letterSpacing: -0.5 },
  section: { fontSize: 20, lineHeight: 29, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 25.5 },
  detail: { fontSize: 15, lineHeight: 22.5 },
  list: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 19.5 },
} satisfies Record<string, TextStyle>;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { small: 12, button: 16, card: 24, sheet: 28 } as const;

// Single layout contract shared by every tab and editor.
export const layout = {
  pageInset: 24, pageTop: 16, headerHeight: 48,
  navigationHeight: 72, sectionGap: 24, actionGap: 16,
  sheetInset: 24, titleBottom: 16,
  duoNavigationWidth: DUO_CHROME.width, duoNavigationHeight: DUO_CHROME.height, duoNavigationInset: DUO_CHROME.gap,
  duoNavigationItemSize: DUO_CHROME.itemSize, duoNavigationIconSize: DUO_CHROME.iconSize,
  duoPaneDividerInset: DUO_CHROME.dividerInset,
} as const;
