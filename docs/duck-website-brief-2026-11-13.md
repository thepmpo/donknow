# 덕 소개 사이트 — 디자인과 실제 동작 계약 · 2026-11-13

## 현재 결과와 범위

사용자 요청은 https://pickle.com/ko 의 **디자인뿐 아니라 움직임·버튼 동작도 유지하고 내용은 덕으로 바꾸는 별도 소개 사이트**다. `website/`에 React/Vite 구현을 만들고 PC/모바일 실제 조작 검증을 통과했다. 정지 캡처만 준비한 이전 상태는 대체됐다. 기존 Expo 앱·API·데이터·인증·서명·Duo UI·수동 TestFlight 정책과 AI 사무실 정지는 그대로다.

현재는 **동작하는 비교용 프로토타입 완료**다. 소개 사이트를 운영 앱의 루트에 덮어쓰거나 Sites/Render에 새 사이트로 공개하지 않았다. 원본 배경·장식 캐릭터는 디자인을 직접 대조하기 위한 참고 자산이며 덕 자체 제작물이라고 주장하지 않는다. 공개 제품 출시 전 덕용 자산 교체 또는 권한 확인, 최종 사용자 Mac/Windows/Safari·휴대폰 검수가 남아 있다.

## 바로 찾을 링크와 파일

- [사이트 코드/실행·다운로드 패키지](../website/README.md), [검수 원본](../website/design-qa.md).
- [현재 PC·모바일 화면과 실제 조작 영상](../artifacts/duck-website-2026-11-13/), [원본 조작 영상과 실측 JSON](../artifacts/duck-website-reference-2026-11-13/).
- [성공한 원본 기록43423800908](https://github.com/thepmpo/donknow/actions/runs/43423800908). 저장소에는 artifact 만료 이후에도 필요한 증거를 보존한다.
- [개인 Notion 업무 기록](https://app.notion.com/p/41718ee82991812eb531ed8d776e095d), [공개 프로젝트 문서](https://duckduck-test.onrender.com/project).
- 실제 사용 앱 https://duckduck-test.onrender.com/ · [개인정보](https://duckduck-test.onrender.com/privacy) · [지원](https://duckduck-test.onrender.com/support).

## 원본 확보와 신뢰 수준

로컬 네트워크가 pickle.com을 허용하지 않아 curl CONNECT403/Playwright tunnel 오류가 있었다. 사용자에게 캡처만 요구한 안내는 전체 동작 구현에 부족했다. 별도 GitHub 표준 무료 Linux CI가 고정 익명 공개 홈페이지를 실제 브라우저로 기록했다. 로그인/폼 제출/구매/계정 자료 없이 contents-read checkout과2일 artifact를 사용한다. 환경의 TLS/네트워크 정책·인증은 바꾸지 않았다.

첫43423394887은 **캡처 성공/업로드 실패**였다. hidden output 경로를 일반 `reference-output/`로 고친5fec1ab의43423800908은 전체 성공, source artifact14034834359 ZIP33,100,778bytes·SHA2569088427a6bd760a27886f26b550f4687bf4b4d7ff8838f818b97f6829f37ef6c다. 실제 ZIP을 내려받아 해시 확인 후 PC1440×1000·모바일390×844의 영상/PNG/DOM/computed style/animation/상태 전후를 열어 구현했다.63개 공개 자산10,923,927bytes, 두 viewport pageerror0. TinyFish의 고정 헤더 보고 모순은 실측 CSS/영상으로 판단했고 도구 삽입 `__tf_cursor`는 복사하지 않았다.

## 화면과 핵심 동작

| 구간 | 구현 동작 | 덕에 맞춘 내용/경계 |
| --- | --- | --- |
| 헤더 | 반투명/blur, 스크롤 방향과 밝기 변화, 모바일 menu, KR/EN 실제 문구 전환 | Duck 표시·기능/개인정보/도움말 |
| Hero | PC·모바일 별도 반복 영상, 제목/부제 등장, 아래 chevron bob, 명시 재생/정지 | ‘AI와 함께하는 하루, / 조금 더 가볍게’ |
| 기능 소개 | 4개 pill 선택, 좌우키/터치 swipe, 중앙 정렬, 재생 진행률, 종료 후 다음 기능, phone crossfade | 일정/Todo/붙여넣기→확인/완료 기록 |
| 전화기 내부 | 실제 Expo 웹 화면의 격리 API·예시 데이터 녹화4개 | native iPhone 영상·실계정 실행이 아님 |
| 만드는 방식 | 실제 참고 영상 마스크, 스크롤에 따라 blur 배경이 어두워짐 | 덕의 사용자 확인 원칙·실제 /project 링크 |
| 개인정보 | 3개 카드 hover/이미지 확대, 실제 정책/실행 문서 링크 | 암호화/계정 분리/실행 전 확인. enclave/자동 구매/통화를 주장하지 않음 |
| FAQ | 한 항목씩 열고 닫기, 높이/chevron 전환, 키보드 사용 | 실제 AI 자료 동의/외부 변경 확인/현재 배포 상태 |
| 덕 열기 | PC anchored QR popover·mobile full-width panel, Escape·배경·닫기, 초점 복귀/Tab 제한 | 실제 덕 웹 URL의 QR. 원본 QR/스토어 주소 사용 금지 |
| iPhone 테스트 | 현재 상태 안내 dialog, 웹/문의 연결 | 공개 TestFlight 초대·App Store 링크를 추측하지 않음 |
| Footer | sticky 뒤쪽 화면이 스크롤로 드러나는 reveal, 실제 CTA·지원 링크 | Kim Sanghyun / thepmpo.official@gmail.com |

## 재현 수치와 토큰

수치는 원본에서 관찰한 값이며 Apple 공식 값이나 기존 덕 앱의 토큰이 아니다. 아래를 변경하면 원본과 같은 상태·크기로 다시 대조한다.

| 요소 | Desktop | Mobile≤700px |
| --- | --- | --- |
| 헤더 | 높이77, column min(993, width−80), blur14.6 | 높이68+safe-top, 좌16/우10 |
| Hero | 100svh·최소560, frame 좌우23/하32, 아래radius81 | 좌우12/하16, 아래radius40 |
| 제목 | 56/1.3, tracking−1.68, top34.9%, 최대560 | 36/1.3, −1.08, top30% |
| 부제 | 24/1.2, margin13 | 18/1.2, margin10 |
| 소개 | 상143/하132, title44/1.4·상23 | 상96/하88, title28/1.4·상12 |
| Phone stage | 1443기준640 높이, phone x580/y12/w284.1/h617/r36.834 | 390기준510, phone x85/y16/w220/h478/r28.5 |
| Feature pill | 18/1.4·padding12/16·gap16·radius90 | 16/1.4·padding10/14·gap10 |
| 연구 구간 | 993column, grid501/405·gap55, minheight819, 영상525×631 | 세로 text→video→license, padding96/24/72 |
| 카드/FAQ | 3column, gap24, radius32; FAQ폭980·상112 | 1column, gap16, radius28; FAQ좌우24·상72 |
| Footer reveal travel | 590 | 504 |

색은 흰색/검정, 소개 label#3c90ff, 버튼#f7f7f7, 카드#1d1d1f→hover#2a2a2d, 연구#1a1a1c+영상blur25+black60% dim, 보안black이다. 원본의 상용/trial font는 복제하지 않는다. 시스템 서체를 쓰고 Korean fallback의 regular 획/AI 강조를 시각 대조로 맞춘다. 플랫폼별 실제 글리프 차이와 영상의 캡처 시각 차이를 허용하되 줄바꿈/상하 위치/크기를 임의로 바꾸지 않는다.

| 모션 | 값과 조건 |
| --- | --- |
| Hero title/subtitle | .9s cubic(.22,1,.36,1), 지연.12/.26s, opacity0→1·Y24→0 |
| Chevron | fade.6s/.7s 지연; bob2.4s ease-in-out·4px |
| Header | blur 등장.8s, 숨김.32s cubic(.32,.72,0,1), 배경/색.24s |
| 기능 track / phone | .56s cubic(.32,.72,0,1) / opacity.3s; 실제 영상 시간으로 진행률 |
| FAQ | grid0fr→1fr .32s cubic(.32,.72,0,1), chevron.26s |
| 메뉴/QR | opacity/position.16s, QR panelY−8→0 |
| 카드 | bg.2s, 이미지scale1.04·.4s cubic(.22,1,.36,1) |
| 상태 | reduced motion이면 등장/전환 없이 즉시·영상 정지; 사용자가 재생을 직접 선택할 수 있음. 화면 밖/문서 hidden은 중지, 일시정지·복귀 시 같은 재생 위치 보존 |

## 구현 파일과 임의 변경 금지

`website/src/App.jsx`가 독립 상태·콘텐츠·영상을 연결하고 `reference.css`는 실측 수치의 추적 가능한 바탕, `styles.css`는 덕 문구/반응형/키보드/폰트 보정이다. `decorations.json`은 원본의 실제 asset 좌표다. `public/assets/demos`는 실제 덕 합성 데이터 영상, `reference-assets.json`은 원본 참고 자산의 URL/해시다. `scripts/record-product-demos.mjs`로 재녹화하고 `tests/interaction.mjs`로 검증한다.

원본 layout을 새 카드형 웹/그라디언트 마케팅 화면으로 임의 재해석하지 않는다. 영상·스크롤·click state를 스크린샷으로 대체하지 않는다. 기존 덕 앱에 이 웹의 토큰을 일괄 적용하지 않는다. 원본 전화기 제품 UI·상표·QR·보안 기술·가짜 고객/출시 수치를 덕 기능으로 붙이지 않는다. /privacy·/support 같은 기존 공개 문서를 유지하고 실제 앱 링크는 별도다.

## 검증·인계·남은 작업

[검수 결과](../website/design-qa.md)의 실제 evidence를 기준으로 한다. 웹 production build·Sites packaging4개·PC/모바일 조작·320/390/700/768/1440 overflow·전체250개 중249통과/실패0/기존 선택1제외다. 소개 사이트는 계정/AI/외부 API 호출 없이 검증했고, QR의 destination은 실제 앱이다. 실제 계정 쓰기 성공이나 native Safari 검증으로 확대하지 않는다.

관리 환경의 preview relay가 없고 화면 열기 도구가 응답하지 않아 사용자가 보는 cloud panel을 확인하지 못했다. 로컬 Vite와 실제 브라우저 검증은 성공했다. 다운로드 패키지는 JS/CSS를 inline하고 미디어를 상대 경로로 묶었으며 동일 패키지의 로컬 HTTP 동작을 검증한다. 이 환경의 file URL은 관리자 정책으로 차단되어 Mac/Windows의 직접 파일 열기까지 완료로 주장하지 않는다. `deliverables/duck-website-preview.zip`은 재생성 가능하고 저장소에는 생성 도구를 보관한다.

다음 작업: 사용자 PC/휴대폰에서 결과 확인 → 공개용 Duck 자산 교체/권한 확인 → 공개 주소/운영 앱 진입 위치 합의 → 요청받은 배포만 실행. 현재 TestFlight는 별도26번의 native/Apple 업로드 성공 상태이며 이 사이트로 새 iPhone 빌드를 실행하지 않았다.
