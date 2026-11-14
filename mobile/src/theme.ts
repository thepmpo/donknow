import {DynamicColorIOS,Platform} from 'react-native';
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
// Semantic colors resolve inside native styles, including already-created StyleSheets.
// Web variables also update without remounting forms or losing Calendar state.
const semantic = {
 bg: ['#ffffff','#000000'], surface: ['#f9fafb','#1c1c1e'], grouped: ['#f2f4f6','#2c2c2e'],
 sheet: ['#ffffff','#1c1c1e'],popup: ['#ffffff','#323234'],popupLine: ['#d1d6db','#5b5b60'],scrim: ['#00000055','#00000099'],
 text: ['#191f28','#f5f5f7'], secondary: ['#4e5968','#d1d1d6'], muted: ['#6b7684','#98989d'],
 subtle: ['#8b95a1','#8e8e93'], outsideMonth: ['#9299a3','#77777e'],
 blue: ['#3182f6','#64a8ff'], action: ['#1b64da','#1b64da'], blueText: ['#1b64da','#64a8ff'],
 line: ['#e5e8eb','#38383a'], pale: ['#e8f3ff','#10243e'], white: ['#ffffff','#ffffff'],
 danger: ['#d92d40','#ff626c'],
} as const;
if(Platform.OS==='web'&&typeof document!=='undefined'&&!document.getElementById('duckduck-system-theme')){
 const style=document.createElement('style');style.id='duckduck-system-theme';
 const variables=(dark:boolean)=>Object.entries(semantic).map(([key,pair])=>'--duck-'+key+':'+pair[dark?1:0]).join(';');
 style.textContent=':root{color-scheme:light dark;'+variables(false)+'}@media(prefers-color-scheme:dark){:root{'+variables(true)+'}}@media(prefers-contrast:more){:root{--duck-outsideMonth:var(--duck-muted)}}';document.head.appendChild(style);
}
export const colors=Object.fromEntries(Object.entries(semantic).map(([name,[light,dark]])=>[name,
 Platform.OS==='web'?'var(--duck-'+name+')':Platform.OS==='ios'?DynamicColorIOS({light,dark,highContrastLight:name==='outsideMonth'?'#6b7684':light,highContrastDark:name==='outsideMonth'?'#98989d':dark}):light,
])) as Record<keyof typeof semantic,string>;
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
  navigationHeight: 72, navigationInset: 12, navigationBottomGap: 8, navigationRadius: 32, sectionGap: 24, actionGap: 16,
  sheetInset: 24, titleBottom: 16,
  duoNavigationWidth: DUO_CHROME.width, duoNavigationHeight: DUO_CHROME.height, duoNavigationInset: DUO_CHROME.gap,
  duoNavigationItemSize: DUO_CHROME.itemSize, duoNavigationIconSize: DUO_CHROME.iconSize,
  duoPaneDividerInset: DUO_CHROME.dividerInset,
} as const;

// Duck implementation values, not Apple-mandated timings or dimensions.
export const navigationMotion = { travel: 250, press: 100, release: 180, pressedScale: 1.08 } as const;
