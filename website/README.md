# 덕 소개 사이트 — 영상 없는 새 구성

2026-11-19 사용자 요청으로 Any.do의 페이지 흐름을 참고하고 내용·UI는 개인 비서 덕에 맞췄습니다. 기존 피클 참고 구현은 Git 이력과 원본 자산에 보존합니다. 새 빌드는 `public-site/assets/duck.png`만 가져오며 영상/피클 자산을 로드하지 않습니다.

## 실행

```bash
npm --prefix website run dev -- --host 0.0.0.0 --port 4173 --strictPort
npm --prefix website run build
npm --prefix website run test:sites
npm --prefix website run test:download
npm --prefix website run test:interaction
npm --prefix website run download
```

조작 검사는 기존 `mobile/node_modules/playwright-core`와 `/usr/bin/chromium` 또는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`이 필요합니다. `WEBSITE_ORIGIN`으로 검사 주소를 고릅니다. 산출물은 `dist/client`(기존 Render의 `/site/` 자산 경로)이고, `dist/server`/`dist/.openai`의 기존 Sites 패키징 계약을 보존합니다. 별도 Sites 프로젝트를 만들지 않습니다.

## 동작과 범위

- 소개 예시에서 Todo/일정 이동·완료/복원·초기화. 실제 계정에는 쓰지 않습니다.
- 같은 문서의 요금표는 `../public/pricing.html` 정본을 빌드 시 추출/격리합니다.
- 무료/라이트(월9,900원 제안·외부 AI 연결 준비 중)/프로월27,900원 개편안입니다. 실제 권한·결제·AI 사용량은 바꾸지 않았습니다.
- KR/EN(요금표는 한국어), 모바일 메뉴/FAQ/QR/iPhone 상태 안내·초점/동작 줄이기.
- 동일 origin의 `/app`과 기존 지원/개인정보/제품 문서 링크를 유지합니다.
- `download`는 `deliverables/duck-anydo-site-preview`의 설치 없는 검토 사본을 만듭니다. 같은 패키지의 HTTP 실행과 파일 직접 열기는 별도 검증입니다.

[범위·공식 근거·검증](../docs/duck-anydo-site-2026-11-19.md), [QA](design-qa.md). Any.do는 직접 브라우저 캡처가 차단되어 시각 일치를 주장하지 않습니다. 덕 PNG는 기존 Twemoji14.0.2 자산(CC BY4.0), 아이콘은 Lucide(ISC), QR은 qrcode(MIT)입니다. Any.do의 자산·수치·후기는 복사하지 않았습니다.
