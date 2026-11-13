# 덕 소개 사이트 — 실제 디자인·동작 QA

final result: passed — 비교용 웹 프로토타입. 공개 출시·실계정/native·사용자 Mac/Windows 파일 열기 완료가 아니다.

## Source visual truth

https://pickle.com/ko · [성공한43423800908](https://github.com/thepmpo/donknow/actions/runs/43423800908)·source5fec1ab. 직접 내려받은 ZIP14034834359의 SHA2569088427a6bd760a27886f26b550f4687bf4b4d7ff8838f818b97f6829f37ef6c를 확인했다. 원본 PC1440×1000·모바일390×844의 실제 영상·DOM·스타일·전후 화면을 읽고 열어 구현했다. [지속 보존 증거](../artifacts/duck-website-reference-2026-11-13/). 텍스트 브라우저 보고만으로 시각 검수한 것이 아니다.

## 구현 캡처와 나란히 비교

동일한 viewport의 원본·구현을 **한 이미지 입력에 함께 배치해** 직접 확인했다. 이미지 조합은 검수용 비교이며 앱의 자산으로 쓰지 않는다.

- [PC 전체 첫 화면](../artifacts/duck-website-2026-11-13/desktop-hero-comparison.png).
- [모바일 전체 첫 화면](../artifacts/duck-website-2026-11-13/mobile-hero-comparison.png).
- [PC QR 창 집중 비교](../artifacts/duck-website-2026-11-13/desktop-open-comparison.png).
- 실제 구현의 demo/research/security/FAQ/footer/menu PNG와 PC·모바일 조작 WEBM은 [같은 증거 폴더](../artifacts/duck-website-2026-11-13/)에 있다. 원본 조작 WEBM과 수치는 별도 보존한다.

브랜드·실제 덕 문구/전화기 영상/QR 목적지/안내 링크는 요청에 따른 차이다. 프레임 인셋/곡률·주요 위치/글자 크기/배경 미디어·주요 모션을 유지한다. 영상은 캡처 순간이 달라 캐릭터 자세가 다르며 pixel-diff 점수를 동일성 증거로 사용하지 않는다. 상용/trial 폰트는 복제하지 않고 시스템 서체·한국어 regular 획·AI 강조를 맞췄다. OS 글리프 차이는 남는다.

## 발견→수정→재검수

| 항목 | 수준 | 수정·실제 재확인 |
| --- | --- | --- |
| 정지 캡처만 요구하고 전체 동작 누락 | P1 | 원본 영상·전후 상태 수집 후 기능/메뉴/QR/FAQ/스크롤을 실제 구현 |
| 제목이 모바일3줄, Korean fallback이 과도하게 굵음 | P2 | 같은36/56 크기·line-height·top 유지, 덕 문구2줄·regular 획/AI 강조, 나란히 재비교 |
| 화면 밖 phone 영상 재생 | P2 | IntersectionObserver·active·visibility 조건, 실제 paused 검사 통과 |
| OS reduced motion 변경 후 이전 재생 opt-in 잔류 | P2 | media preference 변화 시 opt-in 초기화, 정지·명시 재생 검사 통과 |
| anchor의 scroll padding+margin 이중 간격 | P2 | header padding 하나로 통일, 모바일 메뉴 실제 anchor 검사 통과 |
| 다운로드 HTML의 $ replacement token 손상 | P1 | String.replace callback으로 byte 보존, 실제 bundle pageerror0·회귀 테스트 통과 |

남은 P0/P1/P2 결함: 검증 범위 안에서 확인된 미해결 없음. 아래 ‘출시/기기 제한’은 별도 단계이며 완료로 확대하지 않는다.

## 실제 동작 검증

`PLAYWRIGHT_BROWSERS_PATH=/tmp/duck-browser-cache node website/tests/interaction.mjs` 통과. [기계 판독 결과](../artifacts/duck-website-2026-11-13/verification.json).

PC와 모바일 각각 Hero autoplay/재생·정지, offscreen pause, 실제 덕 web QR/링크, Escape·초점 복귀, KR/EN, iPhone 테스트 상태 dialog, 실제 앱 녹화4개/키보드 선택, 영상 종료 후 자동 전환, scroll backdrop, FAQ 열고 닫기, footer reveal/CTA,320·390·700·768·1440 overflow 없음, reduced motion·명시 재생을 확인했다. 모바일 메뉴·anchor·CDP 실제 touch swipe도 통과했다. pageerror0/HTTP실패0/외부 네트워크 호출0이며 실제 AI·메일·쓰기·로그인은 실행하지 않았다.

Production build와 Sites packaging4개 통과, 다운로드 byte 보존 회귀 통과. 전체 저장소250개 중249통과·실패0·기존 선택1제외다. 실제 덕 화면 녹화는 기존 합성 API fixtures를 사용해4개 모두 pageerror0으로 만들었다. UI 변경을 위한 native 테스트·새 iPhone 빌드는 없다.

다운로드의 inline JS/CSS·상대 경로 영상·메뉴는 동일 패키지를 로컬 HTTP로 열어 pageerror0으로 검증했다. 이 환경의 file URL은 관리자 정책으로 차단되어 직접 파일 열기 검증은 하지 못했다. 이를 풀거나 브라우저 보호를 끄지 않았다.

## 출시/기기 제한

- 배경/장식 캐릭터/보안 이미지는 원본 참고 미디어이며 공개 제품 출시 전 덕용으로 교체하거나 권한 확인이 필요하다. 원본 phone UI/브랜드/상용 폰트/JS/QR/스토어 링크는 포함하지 않는다. [출처·해시](reference-assets.json).
- 휴대폰 안은 실제 덕 **Expo 웹+합성 데이터 녹화**다. native iPhone·실계정 결과가 아니다. 아직 공개 App Store/TestFlight invitation이 없다.
- 실제 Safari/iOS 저전력 autoplay·VoiceOver·Mac/Windows file 열기는 별도 검수다. 영상이 재생되지 않을 때 실제 앱 poster가 보이며 reduced motion은 정지 상태가 기본이다.
- local Vite·브라우저 검증은 성공했지만 `sites-preview` relay 부재, cloud panel 열기 도구 무응답으로 사용자 화면이 열렸다고 주장하지 않는다. 별도 사이트를 Sites/Render에 공개하거나 기존 운영 앱을 덮어쓰지 않았다.

## 이전 이력

c6baaea: 원본 저장 가능 이미지가 없어 blocked. 0fbaca2: 전체 동작 수집 도구 준비.43423394887: 캡처 성공·hidden output의 artifact 업로드 실패.5fec1ab/43423800908: 경로 수정·전체 성공·실제 ZIP 회수. 그 뒤 본 구현/조작/비교 검수가 끝나 현재 passed로 전환했다. 과거 blocked를 현재 상태로 재적용하지 않는다.
