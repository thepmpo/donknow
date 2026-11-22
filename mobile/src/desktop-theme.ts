import {Platform} from 'react-native';
// The landing workspace is the visual source; only the desktop subtree uses it.
if(Platform.OS==='web'&&typeof document!=='undefined'&&!document.getElementById('duck-desktop-theme')){
 const style=document.createElement('style');style.id='duck-desktop-theme';
 style.textContent=`[data-testid="desktop-workspace"]{--duck-bg:#fff;--duck-surface:#f5f7fa;--duck-line:#e9edf2;--duck-text:#18232e;--duck-secondary:#687583;--duck-muted:#768290;--duck-subtle:#8592a1;--duck-pale:#eaf1ff;--duck-blueText:#2767df;--duck-web-sidebar:#f8fafc;--duck-web-top:#fbfcfe;--duck-web-aside:#fcfdfe;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',Arial,sans-serif}@media(prefers-color-scheme:dark){[data-testid="desktop-workspace"]{--duck-bg:#151a20;--duck-surface:#202730;--duck-line:#303946;--duck-text:#eff3f8;--duck-secondary:#c1cad5;--duck-muted:#a3afbf;--duck-subtle:#95a2b4;--duck-pale:#203552;--duck-blueText:#8db8ff;--duck-web-sidebar:#191f27;--duck-web-top:#191f27;--duck-web-aside:#191f27}}`;
 document.head.appendChild(style);
}
