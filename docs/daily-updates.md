# 매일 개발 정리

### 2026-11-10 — 수동 기록: 사무실 승인·격리 게이트

- 사용자 다음 단계 요청에 따라 별도 Claw-Empire 사무실에 작업/프로젝트/담당자/기준HEAD/인계서 해시를 묶는10분 승인·철회·단일 실행을 구현했다. 읽기 전용 제품 source, 승인된 개발 worktree만 쓰기, 원본/공용 Git 읽기 전용, 회의·API·OAuth·직접 spawn·설치·자동 merge/push 우회를 차단한다.
- 일반 세션과 별도의 운영자 확인을 요구하며 사무실/공급자 비밀값을 worker 환경으로 전달하지 않는다. 새 임시 HOME과 읽기 전용 인증 파일, 프로젝트 로컬 .codex 차단을 추가했다. 실제 모델은 호출하지 않았고 업무/승인/직원 모델 연결은0이다.
- 사무실 API237개(신규 정책/훅/실행 경계34개 포함), production build, 가짜 자료+고정 셸의 실제 OS 마운트 smoke를 통과했다. 도구 샌드박스 내부 uid-map 제한과 호스트 실행 가능 경로를 구분해 서버를 정상 교체했으며 workersEnabled:false를 유지한다. 실제 Codex 인증/모델 전체 실행은 다음 검증 대상이다.
- 재현 패치와 pinned upstream/SHA-256을 tools/ai-office에, 승인·적용 도구를 scripts에, 운영 상태/한계를 ai-office-approval-gate.md에 저장했다. 별도 clone에서 패치 정확한 재현을 검증했다. vendor에는 로컬 policy commit28baa44만 만들고 upstream push는 하지 않았다.
- duckduck 앱/서버·Figma·브리핑·날씨·Duo·운영 데이터/인증·복구 bundle은 보존했다. 변경 전 사무실 DB 백업도 보존한다. GitHub 문서 저장과 Render 공개 반영은 구분한다.


### 2026-11-10 — 수동 기록: AI 사무실 초기 구동

- 사용자 요청에 따라 duckduck과 이후 DAYWIT/다른 프로젝트를 필요에 따라 연결하는 별도 AI 사무실 기반을 준비했다. DAYWIT 주소는 나중에 받으며 다른 프로젝트 추가가 가능한 등록 도구를 보존했다.
- Claw-Empire2.0.4 pinned source를 별도 복제·설치·빌드하고 한국어 실제 화면/health200·브라우저 오류0을 확인했다. duckduck은 원본이 아닌 격리 소스 사본을 수동 배정으로 등록하고 사본의 push를 비활성화했다.
- 직원 모델 연결0·업무0·자동배정false·YOLO false로 시작한다. 실제 AI 작업/과금·승인 게이트 완성은 아직 아니며 제품팀 읽기 전용·승인 후 개발 실행 검증 뒤 활성화해야 한다.
- 앱/서버/Figma/브리핑/날씨/운영 인증·데이터·복구 bundle은 보존했다. 자세한 상태·실행/등록 명령·남은 작업은 ai-office-setup.md에 기록했다.


### 2026-11-10 — 수동 기록: 톤앤톤 공식 승인

- 사용자가 최신 추천안 A + ② + 가를 승인했다. 차분하고 친근한 비서·필요할 때 역할 표시·오리는 인사/완료 순간에 가볍게 표현을 공식 기준으로 확정했다. 초기 초안의 A + ① + 가보다 이번 승인이 우선한다.
- 디자인 가이드·쉬운 설명·상세 분석·재사용 원칙 RP-01~RP-12를 공식 v1.0으로 갱신하고 인수인계/공개 문서 생성 소스에 반영했다. 새 화면/수치/구현을 일괄 승인한 것으로 확대하지 않는다.
- 앱·서버·Figma69개·브리핑·날씨·Duo·인증/데이터·복구 bundle은 보존한다. 이번 작업은 문서 반영이며 Render 공개 반영 여부는 Git 저장과 구분한다.


### 2026-11-10 — 수동 기록: AI 사무실 대화·톤앤톤 분석

- 첨부 텍스트 전체684줄을 읽고 직접 사용자 선호·이전 AI 추천·현재 코드·새 디자인 후보를 분리했다. [15개 영역 상세 분석](ai-office-ux-analysis.md), [쉬운 설명·선택지](ai-office-tone-summary.md), [재사용 원칙 v0.1](reusable-product-design-principles.md)을 작성했다. 원문 전체는 공개하지 않았다.
- 사용자 운영 확인: Render f76172d, iPhone Actions 성공, TestFlight1.0.0(12). 이번 에이전트의 독립 기기 검증과 구분한다. 실제 AI/실계정 가동은 미완료다.
- 제품 분석·사용자 승인 후 개발 인계하는 원칙을 정리했다. 새 시각 톤은 합의 대기이며 앱·서버·Figma69개·브리핑·날씨·인증·데이터는 변경하지 않는다.
- 채팅에서 붙여넣기 후보 확인 후 Todo 추가, 예약 덕 채팅으로 브리핑/날씨 전달 방향만 기록했다. 후속 간략 문서 전 상세 구현 보류. DuoTrailingNavigation은 Apple iPhone Duo 전용 보류 요구로 기록하고 “Duo 진행” 전 코드 수정 금지다.
- Figma metadata는 Starter 호출 한도로 실패. 운영 두 URL은 프록시403/웹 도구 실패. Apple 제품 페이지는 별도 웹 도구로 본문 확인했으나 개발 API는 미검증이다. 로컬 생성 문서·GitHub 저장과 Render 공개 반영을 구분한다.


<!-- daily:2026-11-10:start -->
### 2026-11-10 — 당일 저장된 작업

실제 정리: 05:36 KST. 새 저장 작업 2개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

- [ede1f9c](https://github.com/sjfieni/donknow/commit/ede1f9c35d6dd0fe9af2a2f720fb731e883abf99) · 11-09 11:01 · docs: preserve 69 Figma wireframes and pending review checklist

- [fcb481b](https://github.com/sjfieni/donknow/commit/fcb481b0c416379bddc323e876ac1cbe7298e543) · 11-09 12:18 · docs: compare current mobile UI with existing wireframes
<!-- daily:2026-11-10:end -->

<!-- daily:2026-11-09:start -->
### 2026-11-09 — 당일 저장된 작업

실제 정리: 01:35 KST. 새 저장 작업 0개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

이 실행 구간에 새로 저장된 작업이 없습니다. 이전 작업과 최신 수동 변경 기록은 유지합니다.
<!-- daily:2026-11-09:end -->

<!-- daily:2026-11-08:start -->
### 2026-11-08 — 당일 저장된 작업

실제 정리: 01:15 KST. 새 저장 작업 0개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

이 실행 구간에 새로 저장된 작업이 없습니다. 이전 작업과 최신 수동 변경 기록은 유지합니다.
<!-- daily:2026-11-08:end -->

<!-- daily:2026-11-07:start -->
### 2026-11-07 — 당일 저장된 작업

실제 정리: 02:19 KST. 새 저장 작업 0개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

이 실행 구간에 새로 저장된 작업이 없습니다. 이전 작업과 최신 수동 변경 기록은 유지합니다.
<!-- daily:2026-11-07:end -->

<!-- daily:2026-11-06:start -->
### 2026-11-06 — 당일 저장된 작업

실제 정리: 02:56 KST. 새 저장 작업 4개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

- [b7afa93](https://github.com/sjfieni/donknow/commit/b7afa930e6658772a46de0bc104f1c15b8eecd2e) · 11-04 19:22 · Unify page layout and calendar navigation; automate TestFlight builds

- [7e97f7d](https://github.com/sjfieni/donknow/commit/7e97f7df02b71fa47fbff65749cb3595de77f1a5) · 11-04 19:22 · Publish shared design guide and release automation instructions

- [7ed343d](https://github.com/sjfieni/donknow/commit/7ed343d12845c0a86679658ad6f74068957c142f) · 11-05 12:02 · Assess Workspace Studio as an optional future Todo integration

- [b5c7d54](https://github.com/sjfieni/donknow/commit/b5c7d547575512c0eb266875f400c6dac7bb92e0) · 11-05 12:03 · Embed integration research and assistant guides in full handoff
<!-- daily:2026-11-06:end -->

<!-- daily:2026-11-05:start -->
### 2026-11-05 — 당일 저장된 작업

실제 정리: 02:53 KST. 새 저장 작업 3개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

- [25a9165](https://github.com/sjfieni/donknow/commit/25a916552d9979f6d970d9ddc2d45615a26af6f4) · 11-04 16:32 · Count completed tasks down from five before fading out

- [aac818e](https://github.com/sjfieni/donknow/commit/aac818ebd39163b0709a810c9854fb9b1818c175) · 11-04 17:50 · Add consent-based AI assistant and confirmed cross-service actions

- [f920d8f](https://github.com/sjfieni/donknow/commit/f920d8f3bedbb84544e5d2b3c0503d133f7883e4) · 11-04 18:01 · Refine calendar gestures, event agenda, glass navigation and input UX
<!-- daily:2026-11-05:end -->

<!-- daily:2026-11-03:start -->
### 2026-11-03 — 당일 저장된 작업

실제 정리: 19:52 KST. 새 저장 작업 4개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

- [ef27acd](https://github.com/sjfieni/donknow/commit/ef27acd7ae6f1cbeec47e35ee2c9af431dc7b91f) · 11-03 10:10 · Reflect completion immediately and serialize background saves with undo rollback

- [c2a861f](https://github.com/sjfieni/donknow/commit/c2a861f8a15e41b0146071d8a5c18a82e5a323d7) · 11-03 10:58 · Compact Todo rows with Things-inspired density and record per-screen references

- [e368930](https://github.com/sjfieni/donknow/commit/e368930ef29434c9d4fecbbc58ba7a020f45f65a) · 11-03 11:44 · Add task notes, draggable sheets and compact close controls

- [1e50d9e](https://github.com/sjfieni/donknow/commit/1e50d9e528eb789639cfbc10cc59250573d7882a) · 11-03 11:52 · Record commit identity migration and preserve daily update checkpoint
<!-- daily:2026-11-03:end -->

<!-- daily:2026-11-02:start -->
### 2026-11-02 — 당일 저장된 작업

실제 정리: 19:54 KST. 새 저장 작업 2개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

- [44a8c84](https://github.com/sjfieni/donknow/commit/44a8c84f438583bd3a6b6633757bad149dafb241) · 11-02 12:05 · Record Toss-inspired design reference and Duck application guidelines

- [892c2d1](https://github.com/sjfieni/donknow/commit/892c2d18ac169d90e50acffe3565506b1f334628) · 11-02 12:22 · Add public TDS reference collector for user cloud workspace

- [ce9af89](https://github.com/sjfieni/donknow/commit/ce9af89c5d2d71a2ea53c560c9c6a8594cbf4b96) · 11-02 12:23 · Write collected reference into current cloud workspace

- [02b03a0](https://github.com/sjfieni/donknow/commit/02b03a00e2ae58cdf5dcece8e9d97627b05461ee) · 11-02 13:21 · Document verified TDS reference tokens and native Duck design mapping

- [df99a6d](https://github.com/sjfieni/donknow/commit/df99a6d9ee4f51da0a93bdad89606acc31a2b577) · 11-02 13:28 · Apply verified TDS-inspired native theme across Duck's five tabs

- [5d096f2](https://github.com/sjfieni/donknow/commit/5d096f27b269bac16cbda4958b368ae5fed70e8b) · 11-02 16:17 · Add shared accessible motion and maintain public HTML change history

- [c521084](https://github.com/sjfieni/donknow/commit/c521084aace829c717de74d83d8c4fbf88f699b2) · 11-02 16:37 · Reconcile current handoff status and add self-contained continuation instructions

- [c1422b3](https://github.com/sjfieni/donknow/commit/c1422b3e3b8fde11705e545799c6a3ecd635b5a8) · 11-02 16:54 · Prioritize reader-facing TDS documentation and schedule daily 19 KST updates

- [501ac14](https://github.com/sjfieni/donknow/commit/501ac140a6e1c63c80a1b74c9793bad578c8f0ea) · 11-02 17:22 · Set App Store Connect app ID for noninteractive iOS submission

- [cc5c95f](https://github.com/sjfieni/donknow/commit/cc5c95f753928bbada88d4493d3d3bbeaa29ff9c) · 11-02 17:39 · Fix native Expo font peer dependency and align SDK 58 patches
<!-- daily:2026-11-02:end -->

매일 한국 시간 19:00에 GitHub에 저장된 작업을 모읍니다. 아직 자동 실행 결과를 확인하지 않았습니다. GitHub 예약은 지연될 수 있으며, 채팅에만 있는 내용은 자동으로 수집하지 않습니다. 늦게 저장된 작업은 다음 실행에서 포함합니다.

## 2026-11-10 — AI 사무실 첫 실행 준비

[실행 준비 안내](ai-office-ready.md): 공식 Codex0.167.0 고정, 제품 검토 대기 작업, 사전진단/개인 로그인/일회실행/중지/보고서 명령을 추가했다. 사무실 API247개와 빌드 통과. 실제 도구 격리 검증, 중복 준비 방지와 네트워크·인증 미충족 실행 거부를 확인했다. 네트워크 두 호스트 허용과 ChatGPT 로그인, 실계정 첫 응답 검증이 남는다. 기존 앱·인증·bundle을 보존했다.

## 2026-11-10 — AI 사무실 문서함 즉시 반영

[공통 제품 지식](ai-office-knowledge.md): 기존 문서 기본 연결·파일/본문 즉시 반영·모든 역할의 최신 목록/원문 연결을 구현했다. 공통/프로젝트 문서를 분리하고 문서 변경 시 이전 승인 무효화와 인덱서 중단 차단을 검증했다. 브라우저320px 업로드/버전 변경·CSRF 차단 통과. 실제 모델 학습/외부 배포 완료로 해석하지 않는다.
