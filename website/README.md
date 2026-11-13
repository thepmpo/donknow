# 덕 소개 사이트 · 동작하는 참고 구현

피클 한국어 사이트의 실제 PC/모바일 영상·DOM·스타일을 기준으로 만든 별도 React 사이트입니다. **앱을 대신하는 소개 페이지**이며 기존 Expo 앱, 서버, 인증, 데이터, TestFlight 설정은 건드리지 않습니다.

## 실행과 확인

저장소 루트에서:

```bash
npm ci --prefix website --cache /tmp/duck-website-npm-cache
npm --prefix website run dev -- --host 0.0.0.0 --port 4173
npm --prefix website run build
npm --prefix website run test:sites
PLAYWRIGHT_BROWSERS_PATH=/tmp/duck-browser-cache node website/tests/interaction.mjs
npm --prefix website run download
```

브라우저 검사는 기존 `mobile/node_modules/playwright-core`, Chromium(`/usr/bin/chromium` 또는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`), Playwright가 사용할 FFmpeg를 요구합니다. 이 환경은 이미 설치된 `/usr/bin/ffmpeg`를 사용했습니다. OS 보호/브라우저 정책을 끄지 않습니다. 다른 환경에서는 공식 Playwright FFmpeg 설치를 사용합니다.

`download`는 `deliverables/duck-website-preview/index.html`과 상대 경로 미디어를 만듭니다. CSS·JS를 HTML에 포함하므로 일반 브라우저에서 압축을 풀고 index.html을 여는 방식으로 전달할 수 있습니다. 관리 환경 Chromium의 file URL은 정책으로 차단되어 직접 파일 열기 검증은 못했고, 동일 패키지를 로컬 HTTP로 검증합니다. 최종 사용자 Mac/Windows의 파일 열기는 별도 확인입니다.

## 동작과 실제 제품의 경계

- Hero 반복 영상/등장, 스크롤에 따른 어두운 배경, sticky footer reveal.
- 기능 선택/키보드 좌우/모바일 swipe → 실제 덕 앱 예시 데이터 영상 4개, 재생 진행 표시, 종료 후 다음 기능.
- PC/모바일 메뉴, KR/EN 문구 전환, 실제 덕 웹 URL을 담은 QR, Escape·초점 복귀·Tab 제한.
- FAQ, TestFlight 준비 상태 안내, 실제 웹/지원/개인정보/프로젝트 문서 링크.
- 동작 줄이기, 명시적 영상 재생/일시정지, 화면 밖/백그라운드 영상 중지.
- 휴대폰 내부는 실제 Expo 웹 번들에 격리 API/합성 데이터를 적용한 녹화입니다. 여기서 실제 계정 업무를 실행하지 않습니다. iPhone native 실기기 영상이 아닙니다.

## 자산·브랜드

`reference-assets.json`에 원본 URL·SHA256·크기·로컬 경로가 있습니다. 원본의 배경/장식 캐릭터/보안 이미지는 **디자인·동작 비교용 참고 자산**이며 덕 자체 제작물이라고 주장하지 않습니다. 공개 제품 소개 페이지로 출시하기 전에는 덕용으로 교체하거나 사용 권한을 확인해야 합니다. 비교 구현을 main에 보관하는 것과 상업 공개 출시를 구분합니다.

원본 로고/상용·trial 폰트/제품 전화기 영상/QR/원본 JS/스토어·소셜 링크는 포함하지 않았습니다. Duck 표시는 [Twemoji](https://github.com/twitter/twemoji) 14.0.2의 duck PNG이며 그래픽은 CC BY 4.0입니다. 원본 연구 참고 영상의 Critter는 Blender Studio CC BY 4.0으로 별도 표시합니다. 원본 편집 영상 자체의 사용 권한까지 추정하지 않습니다. 아이콘은 Lucide(ISC), QR은 실제 URL을 qrcode(MIT)로 생성합니다.

배포 전 checklist와 수치·수정 금지 기준은 [제품 계약](../docs/duck-website-brief-2026-11-13.md), 실제 검수와 남은 제한은 [design-qa.md](design-qa.md)를 읽으세요. 공개 App Store/TestFlight 초대 링크를 추측해서 넣지 않습니다.
