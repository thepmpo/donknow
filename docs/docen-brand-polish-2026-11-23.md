# docen 로고 크기·워드마크·소개 문구 정리

기준: 2026-11-23. 사용자 요청에 따른 소개 사이트 수정이며 서비스 출시를 뜻하지 않는다.

## 요청과 최종 표시 규칙

웹 로고를 기존 크기의 두 배로 키운다. 서비스 이름은 기존 소문자 docen을 유지하고 로고형 이름 오른쪽에는 파란 점을 붙인다. 점 색상은 #2366e8로 통일하며 장식 점은 보조기술에서 읽지 않는다. 본문 속 이름, 계정/DB/Bundle ID/URL scheme은 바꾸지 않는다.

상단 로고 이미지 31→62px, 600px 이하에서는 28→56px. 하단 25→50px, 마지막 소개 섹션 49→98px(모바일 40→80px), 안내 모달 42→84px. 글자 크기는 유지해 심볼의 존재감을 높인다. 예시 화면 속 작은 기능 아이콘까지 두 배로 확대하지 않는다. 360px 이하에서는 상단 준비 안내 버튼을 숨겨 로고·언어·메뉴가 한 줄에 들어가게 하고 메뉴 안 안내 링크는 유지한다.

삭제 범위: 중앙 주요 오픈 준비 중 버튼, 그 아래 현재 소개만 공개/웹서비스 준비 안내 문장, 상단 로그인 준비 중 비활성 문구, 마지막 소개 영역의 주요 오픈 준비 중 버튼. 한국어·영어 모두 삭제한다. 중앙 사용법 이동 링크와 마지막 iPhone 안내 버튼은 유지한다. 상단 준비 안내 버튼과 footer 서비스 오픈 안내 링크는 이번 삭제 대상에 포함하지 않는다.

## 구현 경로

- website/src/App.jsx: hero/header/closing의 요청 문구·CTA 제거, 브랜드 점 접근성 표시.
- website/src/styles.css: 위 크기와 좁은 화면 헤더 배치 적용.
- public/admin.html, admin.js, admin.css: 로그인/초기 설정/암호 변경/관리자 로고형 이름 파란 점.
- public/index.html, coming-soon.html 및 public/assets/brand/brand.css: 인증 화면·준비 안내 워드마크 점 통일. Vite publicDir인 website/public-site/assets/brand/brand.css에도 같은 규칙 반영.
- mobile/src/BrandWordmark.tsx 및 screens/ConnectionScreen.tsx: 앱 로고형 이름도 공통 파란 점 컴포넌트 사용. 설치 앱 반영에는 다음 앱 빌드가 필요하다.

## 서비스 공개 경계

준비 문구를 지우는 것은 로그인/가입/내부 자료를 공개하는 요청이 아니다. docen.today의 기존 미오픈 서버 차단과 /coming-soon 경로를 유지한다. 가격/권한/외부 연결/메일/환경변수/기술 식별자는 변경하지 않는다.

## 검증과 재현

npm --prefix website run build, npm --prefix mobile run typecheck, Expo web export 통과. node website/tests/brand-polish.mjs는 320/360/361/375/390/600/900/1440px × KR/EN에서 삭제 항목·로고 크기·점 색상·가로 넘침을 검사하고 PC/모바일 스크린샷을 저장한다. node website/tests/public-launch.mjs는 소개/준비 안내·내부 가입 차단을 검사한다. node --test test/public-launch.test.js test/brand-assets.test.js는 4개 모두 통과했다. screenshots/results: artifacts/docen-brand-polish-2026-11-23/. 390px 한국어 hero를 직접 확인했다.

배포 영수증은 실행 후 이 문서에 기록한다. 웹 배포와 설치 앱 업데이트를 구분하며 이전 iPhone 수동 빌드 dispatch 제한은 native-build-request-2026-11-23.md를 따른다.

## 실제 웹 배포 영수증

기존 무료 Render 서비스 srv-dbgpc0ff3r2c73abc7e0의 autoDeploy=no 확인 후 수동 배포했다. 코드833a7bf, 배포 커밋c41fd7057003430f6f3c28657bd518583c2fa859, deploy dep-dc1plgtg1s2s73e1ad70. 2026-11-23 10:46:54 KST live 완료. 실제 https://docen.today/?v=c41fd70 조회에서 hero 설명/중앙 준비 CTA/상단 로그인 placeholder/마지막 준비 CTA 제거를 확인하고 /api/health의 동일 release를 확인했다. 공개 조회의 정제 HTML은 이미지 픽셀 크기를 제공하지 않으므로 크기·가로 넘침은 앞서 production build 브라우저 검사로 검증했다. 스크린샷 전달 자산 추가 a628074는 내부 문서용이며 실행 UI 변화가 없어 추가 배포하지 않는다. 설치 iPhone 업데이트는 실행하지 않았다.
