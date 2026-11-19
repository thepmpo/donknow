# 덕 사이트 QA — 2026-11-19

- Duck implementation result: passed (local Chromium).
- Any.do visual comparison final result: blocked.
- 이유: 공개 본문과 섹션 구조는 읽었지만 실제 원본 브라우저 접속이 `ERR_TUNNEL_CONNECTION_FAILED`로 실패했다. 픽셀 일치/모션 복제/원본 대비 시각 QA 통과로 보고하지 않는다.

## 이번 검수 대상

사용자가 요청한 영상 없는 덕 자체 내용의 소개 사이트다. 선택한 구조는 큰 소개/제품 예시→사용 흐름→Todo/캘린더→AI 방식→연결→요금표→개인정보/FAQ/시작이다. 앱/연결 기능 자체를 새로 구현했다고 하지 않는다.

직접 열어 확인한 화면: `artifacts/duck-anydo-site-2026-11-19/desktop-hero.png`, `desktop-full.png`, `phone-hero.png`, `phone-full.png`, `desktop-pricing.png`, `phone-pricing.png`. 예시/요금 상태·여백/줄바꿈/본문·리스트·모바일 비교표의 범위를 확인했다.

## 통과

- PC1440×1000·모바일390×844에서 Todo 이동, 명시 날짜/시간으로 일정 생성, 대화에서 완료, 체크/복원, 예시 초기화. API/실계정 쓰기0.
- QR 모달 열기·표시·초점 가두기·Escape/닫기/초점 복귀. iPhone 공개 초대 미제공 안내.
- 모바일 메뉴, FAQ, KR/EN(요금 정본 ko 유지), 320~1440 페이지 overflow0, 비교표만 가로 스크롤, reduced motion.
- production 번들을 실제 서버 하네스로 열어 같은 흐름을 확인했다. 설치 없는 패키지의 HTTP 실행/덕 PNG/Todo 조작도 확인했다.
- 페이지 오류0, 외부/영상 요청0. 직접 CTA는 같은 origin의 `/app`으로 연결한다.
- 라이트 가격은 제안이고 GPT/Dots 연결은 준비 중임을 표시한다. 무제한·자동 Dots 복제·결제 활성화를 주장하지 않는다.
- 큰 이미지/중첩 장식 카드/가짜 고객 수치 없이 기존 덕 자산과 라이브러리 아이콘만 사용한다. 예시 조작은44px 타깃, 화면 내 체크에는 별도44px 터치 영역을 둔다.

## 남은 범위

- 원본 Any.do의 실제 화면/애니메이션 비교.
- iPhone Safari/VoiceOver·실기기 점검.
- 실제 외부 AI의 덕 연결 개발/등록/실계정 검증, 제공량/라이트 최종 가격 확정.
- preview relay가 없어 사용자의 Codex 패널 열림은 확인되지 않았다. 브라우저 패널 열기 요청 queued를 완료로 보지 않는다.
- 운영 사이트 배포는 로컬 검수와 별도 기록한다.

이전 피클 비교 검수 기록은 이전 Git 버전의 같은 파일에서 확인할 수 있다.
