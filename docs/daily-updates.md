# 매일 개발 정리

### 2026-11-12 — 덕 개발 재개 수동 작업 기록

덕 채팅의 후보→편집→확인 실행, 로그인 계정 전환 보호, Apple 공식 Duo 대응, 공개 지원/개인정보 초안과 개인 Notion 기록을 진행했다. AI 사무실은 보류하고 예약 브리핑·날씨는 후속 명세를 기다린다. 실제 변경·검사 결과·외부 계정/실기기/배포의 남은 범위는 [오늘 변경 기록](change-log.md)과 [운영·출시 근거](release-readiness-2026-11-12.md), [Duo 검수](iphone-duo-support.md), [문서 도구·스킬 비교](tooling-and-documentation.md)를 따른다. 후속 iOS 실행 43130303497도 성공해 EAS build number 13을 요청했다. 실제 Apple 처리·설치는 별도다. 아래 자동 집계는 별도의 커밋 목록이며 실제 검사나 배포를 대신하지 않는다.

<!-- daily:2026-11-12:start -->
### 2026-11-12 — 당일 저장된 작업

실제 정리: 02:49 KST. 새 저장 작업 28개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

- [bdd0616](https://github.com/sjfieni/donknow/commit/bdd06166a0fc9d690368696cd617e3238bffc955) · 11-11 10:24 · Prepare Windows and Mac office launchers and complete work handoff packages

- [33c3587](https://github.com/sjfieni/donknow/commit/33c3587e1103e2c9d8db0bd426f9084f2c236e87) · 11-11 10:34 · Apply reversible Jujutsu Kaisen character theme to the AI office

- [34d5902](https://github.com/sjfieni/donknow/commit/34d5902958639d766e1db23bb31c581a2bff9135) · 11-11 11:50 · Preserve Codex login while backing up official temporary CLI artifacts

- [41d3814](https://github.com/sjfieni/donknow/commit/41d3814462319ee118ee98fe53871c39f72117fc) · 11-11 11:57 · Retain observed Codex lock and log files without touching authentication

- [08d01b1](https://github.com/sjfieni/donknow/commit/08d01b14d503a5bac4e0035e2959f3ac6264b39e) · 11-11 12:21 · Enlarge office labels and provide a task-safe Windows UI update

- [ba28041](https://github.com/sjfieni/donknow/commit/ba28041104b3d8e629aad6a79272b457735ee006) · 11-11 13:19 · Add private office request UI, report confirmation and phone access setup

- [948d9f3](https://github.com/sjfieni/donknow/commit/948d9f37686e3d43d5a2c291c7232f4ae9fb4ff8) · 11-11 13:54 · Connect in-office task chat and instruction history; prepare Mac launchers

- [444498d](https://github.com/sjfieni/donknow/commit/444498d3992e38baddbe7bdeccbc564a44bfa1bc) · 11-11 14:02 · Fix blank office scene by allowing Pixi texture workers in native proxy

- [8617bc6](https://github.com/sjfieni/donknow/commit/8617bc6d678200eddac00abc4ef294f382e2d1e5) · 11-11 14:14 · Simplify Windows office startup and add persistent scene text zoom

- [ac2c5ab](https://github.com/sjfieni/donknow/commit/ac2c5ab6ee6663cdc4fcca7122a12fcf848499ec) · 11-11 14:31 · Double office name and speech text with safe automatic UI update

- [c76ed66](https://github.com/sjfieni/donknow/commit/c76ed66329d2ad714943ccd007dca306d800bbde) · 11-11 14:52 · Balance office labels and speech at half the previous text size

- [5642eab](https://github.com/sjfieni/donknow/commit/5642eab112e51d678f9a9e1ea56062d562ae242a) · 11-11 15:22 · Add shared office conversation with message types and honest runtime progress

- [7d8704c](https://github.com/sjfieni/donknow/commit/7d8704cfbe507a9daeb26187de1571312c2ee294) · 11-11 16:39 · Reuse original office chat globally and fix report decisions stuck preparing

- [742cf52](https://github.com/sjfieni/donknow/commit/742cf52f491ecd558b7bf51dac23ef5eacc56640) · 11-11 17:57 · Connect office recipients and team reviews with readable reports

- [f9f0b4a](https://github.com/sjfieni/donknow/commit/f9f0b4a1bdd653c645d8e3fe3dbb59eb2ff6b9db) · 11-11 22:31 · Add read-only Mac sandbox diagnostics for Lima install failure

- [a678c55](https://github.com/sjfieni/donknow/commit/a678c55a49c79ff86925cbbc97f5e21554e46a39) · 11-11 22:42 · Resume Mac installation with scoped office AppArmor support

- [9742e71](https://github.com/sjfieni/donknow/commit/9742e71cf5981441293ad049000182f06afede4b) · 11-11 23:04 · Fix Mac nested sandbox verification with a dedicated proc mount

- [7944058](https://github.com/sjfieni/donknow/commit/79440586e16e3765cd79ee0da9f46b6907270879) · 11-11 23:07 · Record user-confirmed Mac office installation completion

- [18f59e7](https://github.com/sjfieni/donknow/commit/18f59e78bd7afa2de464c01c78e1987a4ac1de89) · 11-11 23:30 · Add one-click Mac office launcher preserving existing services

- [1582eb8](https://github.com/sjfieni/donknow/commit/1582eb88f5179115e0fd2d6469f4fac6bbbf8ee4) · 11-11 23:46 · Add private phone access setup for the existing Mac office

- [9210493](https://github.com/sjfieni/donknow/commit/921049306b77ff9eb073ada26ad050939250d1b5) · 11-12 00:13 · Connect approved office development, validation, publication and deployment

- [f2e34a8](https://github.com/sjfieni/donknow/commit/f2e34a8faf0d5baa43af3293d9958ef1508b32db) · 11-12 01:07 · Document bidirectional AI office handoff and required sync reminders

- [143d2ef](https://github.com/sjfieni/donknow/commit/143d2ef21216fab8986a8fa89686c8f842825de9) · 11-12 01:19 · Explain blocked AI office requests without retrying active work

- [6a09988](https://github.com/sjfieni/donknow/commit/6a0998832c534cb8b9a32c0fde5a79179542fab1) · 11-12 01:19 · Document blocked office requests and meeting follow-up workflow

- [11efaf2](https://github.com/sjfieni/donknow/commit/11efaf240a4de9f49521ee60c9708e3c326c4b9a) · 11-12 01:54 · Connect office role guides, report PDF and Gmail delivery, and safe task actions

- [87e9758](https://github.com/sjfieni/donknow/commit/87e97580779f3a34b544f14d2b0b2ceb6874c644) · 11-12 01:58 · Align packaged control archives with distributed payload bytes

- [11f2538](https://github.com/sjfieni/donknow/commit/11f2538c0652ca1992bfd9f58c783b345dd86416) · 11-12 01:59 · Document office skills, PDF Gmail delivery, task controls and verification

- [5eca395](https://github.com/sjfieni/donknow/commit/5eca395d246a2d1978fbc9185502143dadcb2e0b) · 11-12 01:59 · Record verified office downloads and public documentation access limit
<!-- daily:2026-11-12:end -->

## 2026-11-12 — 필요한 스킬 묶음·PDF와 본인 Gmail·업무관리 연결

[기능별 쉬운 안내](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-capabilities.md)에 추천 스킬 한 번에 연결, PDF 저장, 선택한 PDF를 본인 Gmail로 보내기, 업무 실행 확인·보관/복원, 팀장회의의 실제 범위를 정리했다. 지침은 프로젝트별로 다음 새 업무에 실제 본문과 버전이 연결된다. 외부 스킬 전체 설치나 모델 재학습은 아니다.

사용자는 Gmail을 선택했으며 아직 실제 계정을 연결한 것은 아니다. 최초 설정은 Mac의0번으로 연 사무실에서만 받고 Google16자리 앱 비밀번호를 로컬 암호화 저장한다. 저장한 PDF를 선택·확인해야 발송하며 자동 완료메일은 미구현이다. 서버 접수와 실제 수신은 구분하고 결과 미확인 자동 재전송은 하지 않는다.

업무관리의 콘솔에만 남던 실행·삭제 실패를 바로잡아 실행은 기존 요청의 확인창, 삭제는 보고서·로그·메시지를 보존하는 보관과 복원으로 연결했다. 실행 중·승인 남음·미완료 회의는 보관하지 않는다. 협업은 기존 최대6명 순차 의견+종합1회이며 반복 상호 토론으로 설명하지 않는다.

업무가 끝난 뒤 [Mac11번 업데이트](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-development.zip) 또는 [Windows11번 업데이트](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-control.zip)를 적용하고, 별도로 전체 대화의 코드 수정에서 최신 코드 받기로 프로젝트 기록을 동기화한다. 지침7·메일10·쉬운 보고서7·보관5·제어14개, TypeScript·Vite 빌드 통과. PC·390px 모바일 브라우저, 루트187개 통과·선택 검사1개 건너뜀, 문법37개, Python30개, ZIP5개 CRC·내용 해시 검증을 완료했다. 공개 문서를 생성하고 댓글·일일 집계 회귀와 새 문서 링크를 확인했다. 실기기 적용·Google 앱 비밀번호·실제 Gmail 수신은 미확인이고 Render 자동 배포는 꺼져 있다. GitHub main 일반 push와 Mac ZIP·사용 안내 원본 HTTP 200/파일 일치를 확인했다. Render `/project` 조회는 환경 프록시403으로 차단되어 공개 반영 여부는 미확인이다.

## 2026-11-12 — 사무실 요청 시작 실패 이유 구분

팀장회의 중 새 요청을 실행하지 못한 상황을 사용자가 확인했다. 실제 Mac 오류 코드는 미확인이다. 코드에서 확인한 문제는 진행 중 업무·로그인/실행 준비·실행 설정·바뀐 요청/보고서·실행 결과 확인 필요를 모두 같은 오류로 보여주던 UI였다. 각 사유에 맞는 다음 행동을 표시하도록 고쳤으며 기존 서버 검증과 읽기 전용 범위는 유지한다.

진행 중 업무로 막힌 초안은 그대로 두고 종료 후 사용자가 다시 실행한다. 자동 대기열·재실행은 없다. 회의 수정안을 질문하려면 **종합 보고서 보기 → 이 안건에 추가 요청**으로 실제 보고서를 연결한다. 회의를 문장으로 언급하는 것만으로는 보고서가 첨부되지 않는다. [자세한 사용 안내](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md).

회의 종료 후 [최신 Mac 업데이트 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-development.zip)의 **11-enable-development.command**로 사무실 프로그램을 갱신해야 한다. 프로젝트 **최신 코드 받기**만으로는 적용되지 않는다. 제어 회귀12개 통과; 데스크톱·390px 모바일 브라우저, TypeScript·Vite 빌드, UI/설치·업데이트 Python 회귀26개, 갱신 ZIP5개 검사를 통과했다. 사용자 Mac 데이터·인증 조회나 실제 모델 실행은 하지 않았으며 Render 자동 배포는 꺼져 있다. 실제 Mac 적용·공개 배포는 별도 확인이다.

## 2026-11-12 — 이 채팅과 AI 사무실의 양방향 이어받기 확정

사용자는 여기서 수정한 뒤 사무실 갱신이 필요하다는 안내를 매번 요구했고, 사무실의 수정도 이 채팅 작업자가 알고 이어가야 한다고 확인했다. [공통 이어받기 기준](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-shared-work.md)과 AGENTS 지침을 추가했다. 작업 전 GitHub 최신 main·실제 diff·변경/검증 기록을 먼저 확인하고, 작업 후 프로젝트 최신 코드 받기와 사무실 프로그램 업데이트를 구분해 안내한다. 현재 자동 감시/실시간 대화 공유를 새로 구현한 것은 아니다.

미게시 작업 사본·채팅·보고서·문서함 자료는 자동 공개되지 않는다. 기본 인계 생성기가 모든 격리 작업 사본의 미커밋 변경을 수집하지 않는 한계와 실제 patch/파일·검증 확인 요구를 명시했다. 문서고(스킬 목록)·문서함(제품 자료)·보고서(업무 결과)도 구분했다.

사용자는 Tailscale Serve 허용 완료 화면과 휴대폰 사무실 접속 성공을 확인했다. 모바일에서 작게 보인다는 피드백을 기록했다. Wi-Fi를 끈 모바일 데이터 접속·다른 컴퓨터 접속·11번 개발 업데이트·12번 GitHub 로그인·실제 코드 게시/배포는 미확인이다. 원격 main은 변경 전 fetch해 로컬 기준과 일치함을 확인했다.

검증: 기존 공개 문서 댓글 회귀1개, 일일 문서 집계 회귀1개 통과. 인계/공개 HTML 생성·새 문서 포함·로컬 링크·diff 검사를 확인한다. 앱/설치 패키지/DB/인증/복구 bundle은 변경하지 않는다. Render 실제 배포는 실행하지 않으며 GitHub 저장과 공개 반영은 구분한다.

## 2026-11-11 — 승인한 코드 수정·검사·GitHub 반영·Render 배포 연결

[개발 연결 파일·사용법·계정 단계·검증](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-development.md)을 추가했다. 전역 잠금은 유지하고 승인한 작업만 전용 사본에서 수정한다. 최신 코드/문서 기준을 확인해 fast-forward로 맞추고, 변경 후 별도 격리 검사와 정확한 변경 확인을 거쳐 일반 push한다. 로컬 소스와 작업 사본을 보존하고 게시된 과거 사본도 영수증과 정확히 일치할 때만 다음 동기화에 허용한다. Render는 별도 승인한 정확한 main SHA와 기존 무료 서비스만 대상으로 하며 비밀이 있는 job에서 프로젝트 코드를 실행하지 않는다. 모바일 main 반영에 따른 기존 TestFlight 자동화 가능성을 확인창에 알린다.

Mac11번·Windows11번 업데이트는 유휴/해시 검사·백업·검증된 서버 재시작·실패 복구를 제공하고 검사 도구를 이어서 준비한다. GitHub 공식 로그인12번, 검사 도구 재개13번을 제공한다. GitHub/Render 계정 연결·실제 모델 수정·사용자 기기/배포는 미확인이다. 이번 작업 자체로 Render/TestFlight를 배포하지 않았다. 공개 `/project` 읽기는 환경 프록시의 `Tunnel connection failed: 403 Forbidden`으로 확인하지 못했다. 생성 소스·공개 HTML 파일은 저장했으며 실제 공개 반영과 구분한다.

검증: runtime API262개·웹76개, Python99개 중98개 통과(선택적 기존 bwrap1개 미실행), 개발 제어25개·업데이트11개·검사 준비8개, 실제 릴리스 격리 별도 통과. 타입/빌드·HTTP/CSRF·데스크톱/390px 모바일·기존 대화/회의·문법 검사 통과. 최종 Node 전체160개 중159개 통과·실제 격리 선택 검사1개는 별도 실행해 통과했다. 배포 ZIP9개의 CRC·내용·Mac 실행 권한과 제어 모듈 해시를 확인했다. 복구 bundle의 SHA-256은 그대로다.

## 2026-11-11 — Mac 사무실 휴대폰 비공개 연결

[휴대폰 연결 파일·사용법](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-phone.md)을 추가했다. 기존 Mac 사무실을 재사용하고 동일 Tailscale 계정으로 HTTPS 접속한다. 개인 소유자 설정과 기존 공유 경로를 검증하며 다른 경로·Funnel·계정 충돌은 덮지 않는다. 설정/호스트 모의15개와 ZIP 검증 통과. 실제 계정 로그인·HTTPS 동의·외부 휴대폰 접속은 사용자 확인 대기다. 코드 수정·배포 연결은 후속 작업이며 이번 휴대폰 파일이 해당 권한을 켜지 않는다. Render 배포는 하지 않았다.

## 2026-11-11 — Mac 사무실을 파일 하나로 열기

사용자가 매번 여러 파일을 열지 않도록 `0-open-office.command`와 [소형 시작 패키지](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-open.zip)를 준비한다. 기존 Lima VM과 설치된 사무실·문서함·채팅을 시작/재사용하고 브라우저를 연다. 재설치·업데이트·로그인·새 AI 업무는 자동 실행하지 않는다. 새 서버는 백그라운드에서 유지하며 기존 수동 서버 창과 진행 업무는 보존한다.

Mac 설치·화면 열림·로그인 단계 완료와 채팅 설치 로그는 사용자 보고로 기록했다. 전체 직원 14명의 연결 상태·실모델 응답·새 0번의 실제 Mac 실행은 확인 전이다. 자동 검증과 실기기 확인을 구분하며 [상세 사용법과 인계](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)를 갱신한다. Render 공개 배포는 수행하지 않았다.

검증: 새 실행 검사 17개 통과(호스트 모의9·실제 Linux 임시 서버8), Python 전체58개 중57개 통과·선택적 bwrap1개 미실행, 문법37개·공개 문서 회귀1개·ZIP 내용/CRC/실행권한 확인 통과. 실제 사용자 Mac의 0번 실행은 다음 확인이다.

## 2026-11-11 — Mac 설치 완료 사용자 확인

사용자가 수정 설치기의 설치 검사 완료와 첫 검토 대기 준비 로그를 제공했다. [맥 인계 기록](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)을 갱신했다. 다음 확인은2-start 화면, 본인 로그인, 실제 검토 응답 순서다. 설치 완료를 로그인/AI 가동 완료로 기록하지 않는다.

## 2026-11-11 — Mac 재개 검사기 수정

사용자 재개 실패에서 검사기의 중첩 `/proc` 마운트 누락을 찾아 실제 Linux에서 재현·수정했다. 실제 bwrap를 포함한 설치/복구 검사41개가 통과했다. 별도 브랜치의 Ubuntu24.04 AppArmor CI는 다운로드 DNS 오류로 중단돼 main에 넣지 않았다. 최신 파일·남은 Mac 확인은 [맥 설치 안내](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)를 따른다.

## 2026-11-11 — Mac 격리 오류 원인 확인·재개 패키지

사용자 진단에서 AppArmor userns/bwrap/network capability 거부를 확인했다. 전용 Node 앱별 프로필과 실제 Codex 격리 검사를 포함한 [설치 이어하기 패키지](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)를 준비했다. 일반 격리 프로그램/전역 보호를 풀지 않고 기존 VM·checkout·인증·데이터를 보존한다. Linux 실제 sandbox 검사는 통과했으며 Mac 설치 재개 결과는 대기다.

## 2026-11-11 — Mac 설치 오류 후속

사용자 Mac의 Lima VM 준비 후 bwrap `Failed RTM_NEWADDR` 오류로 설치가 중단됐다. [설정 변경 없는 진단과 다음 담당자 기준](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)을 기록하고 `7-check-sandbox.command`/소형 진단 ZIP을 준비했다. AppArmor 원인 확정과 실제 Mac 격리·설치·로그인 성공은 사용자 진단 결과 후 확인한다. 안전한 격리 검사를 지우거나 시스템 보안을 끄지 않는다.

<!-- daily:2026-11-11:start -->
### 2026-11-11 — 당일 저장된 작업

실제 정리: 02:37 KST. 새 저장 작업 8개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.

- [1c75e51](https://github.com/sjfieni/donknow/commit/1c75e511c9f3ac301703cd863110d8dcedacaa13) · 11-09 17:41 · Add paste Todo drafts, daily briefing and city weather with validated release gates

- [3234c04](https://github.com/sjfieni/donknow/commit/3234c04834a6d13af87f43629cc57a5b7bc2fd39) · 11-10 14:56 · Document AI office preferences, tone options and reusable approval principles

- [ae78d0f](https://github.com/sjfieni/donknow/commit/ae78d0f111c444eda4e2d692a1c7e92bded395b8) · 11-10 15:43 · Confirm official tone and reusable design principles v1.0

- [579984f](https://github.com/sjfieni/donknow/commit/579984f72202d24dbf1b4daccb318b866ab1b086) · 11-10 15:54 · Prepare multi-project AI office and isolated project onboarding

- [cebc65c](https://github.com/sjfieni/donknow/commit/cebc65c732fdf0535326010457d94214e62c2927) · 11-10 16:47 · Add tested AI office approval gate and isolated worker policy

- [2d5c238](https://github.com/sjfieni/donknow/commit/2d5c238184cc4a3034a35d3271a1f2a0e4c2abdd) · 11-10 16:47 · Preserve required unified patch context whitespace

- [59da1b7](https://github.com/sjfieni/donknow/commit/59da1b77a9275f2b0b29cc6fd73b5d455e3426af) · 11-10 17:14 · Prepare AI office first product review and account readiness workflow

- [52f91d5](https://github.com/sjfieni/donknow/commit/52f91d54806054e8b3651fd9f8ae735fb3f4fcb4) · 11-10 17:30 · Add live shared product knowledge inbox for all AI office roles
<!-- daily:2026-11-11:end -->

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

## 2026-11-11 — Windows부터 실행하고 인계

[Windows/Mac 설치](ai-office-local-install.md)와 [문서+작업물+검증 인계](ai-office-handoff.md)를 준비했다. WSL2 Windows 시작/로그인 버튼 패키지와 Mac Lima 경로, 비밀 보존 설정 도구와 인계 수집기를 추가했다. 실제 PC 설치·계정 모델 실행은 미확인이다. 기존 클라우드 데이터/키와 원래 앱을 보존했고 직원 캐릭터 변경 경로를 확인했다.

## 2026-11-11 — 주술회전 직원 외형

[주술회전 테마](ai-office-jjk-theme.md): 직원14명의 외형/한국어 이름을 변경하고 원래 부서·직급·모델·업무를 보존했다. 원래 외형 백업/복원·14명/70개 PNG·실제 사무실 캡처를 확인했다. 최신 Windows 패키지 적용 버튼과 새 설치 기본값에 연결했다. 실제 PC 설치와 AI 로그인/업무 실행 검증으로 해석하지 않는다.

## 2026-11-11 — Windows 로그인 확인 오류

[인증 보존 수정 파일](ai-office-login-repair.md): 공식 CLI의 .codex/tmp 생성으로 로그인 폴더 검사가 실패하는 문제를 재현했다. 인증/키/DB를 유지하고 임시 폴더만 백업한다. 실제 CLI 및 JS/Python/PowerShell 검증을 수행했고 사용자 PC의 수정 후 authReady·모델 응답은 미확인이다.

## 2026-11-11 — Windows 로그인 수정 v2

[로그인 수정 v2](ai-office-login-repair.md): 실제 PC의 tmp/log/auth.lock/auth.json.lock 목록을 반영했다. 인증 파일은 그대로 두고 사용 중이 아닌 보조 파일만 백업한다. 활성 프로세스/잠금·잘못된 경로/다른 설정을 거부하고 비밀 없는 reasonCode를 표시한다. PC의 인증 확인/모델 응답은 결과 대기다.

## 2026-11-11 — 이름/말풍선 확대·사용 흐름

[사용 안내](ai-office-usage.md): 이름11px·말풍선12px와 간격 조정, 진행 중 검토를 건드리지 않는 UI 업데이트 파일을 준비했다. vendor 웹76개·빌드·데스크톱/390px 렌더와 업데이트/전송을 검증했다. Windows 적용·외부 폰 접속·범용 반복 요청 UI는 확인/연결 전이다. PC의 authReady/started는 확인됐지만 첫 실제 결과 보고서는 대기다.

## 2026-11-11 — 입력창과 휴대폰 접속

[업무 제어 추가](ai-office-control.md): 프로젝트별 요청 확인/명시적 제품 검토/진행/중지/보고서 확인 완료를 구현했다. 기존 review 보고서를 보여주며 개발·배포는 승인하지 않는다. Tailscale 본인 전용 Serve 설정 파일을 준비하고 실제 계정/폰 접속은 사용자 확인 대기로 기록했다. 기존 DB/인증/프로젝트와 원래 사무실 설치를 보존한다.

### 2026-11-11 — 사무실 채팅·내 지시와 Mac 준비

- 사무실 내부 채팅 패널, 기존 채팅→내용 확인 연결, 요청 원문 검색/상태 모아보기, 부모 보고서를 참고하는 후속 지시를 추가했다. 실행 중 업무/원 보고서는 변경하지 않는다. 기존 데이터·인증과 복구 bundle 보존.
- [채팅 사용·검증](ai-office-control.md), [Mac 준비·실기기 미확인](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)에 설치 파일과 이어받기 기준을 기록했다. Mac Intel/Apple Silicon Lima .command ZIP은 준비했으나 실제 Mac 실행·Windows 업데이트·실모델 후속 응답은 사용자 기기에서 확인해야 한다. 문서 공개 배포는 GitHub 저장과 별도로 확인한다.

### 2026-11-11 — 사무실 빈 장면 복구

- 메뉴만 뜨는 장면을 실제8810 프록시로 재현했다. Pixi의 blob worker가 CSP로 차단되는 것이 원인이며, 사무실 프록시에만 worker-src를 추가했다. canvas 존재만 검사한 이전 검증의 한계를 정정했다. [복구와 검증 기준](ai-office-control.md).
- 업데이트는 주 사무실을 유지하고 입력 서버만 재시작한다. 기존 데이터·인증을 초기화하지 않는다.

### 2026-11-11 — 시작 간소화·이름과 대사 확대

- 사용자 불편에 따라 [0번 시작 파일](ai-office-control.md) 하나로 기존 사무실/채팅 자동 시작·재사용·창 최소화와 검증된 구버전 입력 서버만 교체하도록 구현했다. WSL 전체 종료/원래 모델 프로세스 종료를 없애고 새 gateway는 진행 중 HTTP를 마친 뒤 종료한다.
- 사무실 canvas 기본150%·선택100~200%·브라우저 저장을 추가했고 실제 브라우저에서 크기 증가와 방/캐릭터 표시를 확인했다. 기존8번 글꼴 패치가 사용자 PC에 적용됐다고 주장하지 않는다. 설치·인증·DB·기존 작업·복구 bundle은 보존했다.

### 2026-11-11 — 이름·대사 자체2배

- 사용자 요청에 따라 이름11→22px·말풍선12→24px로 변경하고 이름표·말풍선·직원 간격을 조정했다. 장면 확대율을 유지하므로 동일 확대율에서 글자가2배다. 최초 한 번 빌드 후0번 시작 파일에서 자동 적용/검사한다.
- 초기/v1 소스만 허용하고 사용자 수정·실행 중 업무를 보존한다. 실패 시 실제 입력 소스로 복구한다. TypeScript/Vite와 실제 사무실 화면, Python/PowerShell 검증을 수행했다. [설치·수치·검증 경계](ai-office-control.md).

### 2026-11-11 — 실화면 크기 합의 반영(v3)

- 사용자가v2가 실제 적용됐음을 확인했고 이름/대사가 너무 크다고 하여 절반인11/12px와 균형 있는v1 배치로 조정했다. 저장된 장면 확대율은 유지한다. 최신0번 시작 파일로 적용하며 데이터·인증은 보존한다. [최신 기준](ai-office-control.md).

### 2026-11-11 — 공용 대화방과 진행 가시성

- 사용자가 카카오톡처럼 직원 대화·자기 지시를 한 공간에서 보고 공지/지시를 골라 보내고 싶다고 요청했다. 사무실 공용방에 실제 메시지·요청·업무/실행 기록·보고서, 과거 기록/검색/종류 필터와 지시/질문/공지 입력을 추가했다.
- 공지는 모델 호출 없이 개인 파일에 저장하고 이후 새 요청에 최근 공지를 참고자료로 전달한다. 전체 직원의 읽음·응답을 꾸미지 않는다. 작업의 저장 상태와 실행기 연결 여부·마지막 활동/경과 시간을 구분한다. 전체 AI 협업은 아직 실행하지 않으며 검토 담당자1명 범위를 유지한다.
- [공용방·상태 기준·보존·검증](ai-office-control.md)에 API/저장/계정 경계와 Windows 실제 적용 미확인을 기록했다. 기존 DB/인증/글자 크기/날씨/브리핑과 복구 bundle은 유지했다.

### 2026-11-11 — 기존 대화하기 재사용·보고서 준비 중 버그

- 사용자가 별도 공용방이 아니라 원래 캐릭터의 대화하기 화면을 전체로 원한다고 정정했다. native Header/메시지 말풍선/Composer를 재사용하고 전체/개별 대화, 모드 선택 전송→안건, 안건 결과 읽기를 연결했다. 별도 /desk는 기본 진입에서 제외했다.
- 의사결정의 알 수 없는 보고서 종류+빈 선택지가 준비 중으로 보이는 버그를 수정했다. 원문 카드와 전용 확인 완료로 연결하며 실패 권한을 성공 보고서로 세지 않는다. 사용자 PC의 실제2건은 직접 확인하지 않았다.
- [최신 화면·수정 근거·소스11개 설치·검증](ai-office-control.md)에 기록했다. 데이터/인증/실행 잠금·확정 글자 크기는 보존했다.

### 2026-11-11 — 직원/팀장 지정·전체 에이전트 연결·쉬운 보고

- 사용자 요청에 따라 native 채팅의 받는 사람 선택, 팀장 분류, 일괄 Codex 연결, 실제 결과에 따라 진행하는 팀장회의를 추가했다. 기존 인증/명시적 OAuth/API 계정·사용자 모델을 보존하고 프로젝트 배정은 병합한다. 준비만으로 모델을 호출하지 않는다.
- 보고서를 결론·할 일·내 결정·미확인부터 표시하고 긴 기술 근거를 접는다. 기존 원문/보고서 확인 hash는 유지하며 이전 형식에서 새 요약을 만들어내지 않는다. 새로운 쉬운 설명은 명시적 질문으로 처리한다.
- [v5 구조·화면·한도·검증 경계](ai-office-control.md)에 기록했다. 실제 사용자 PC의14명 연결/실회의는 미검증이며, 모의 검증과 혼동하지 않는다. 개발/배포 잠금과 기존 데이터·인증·캐릭터·글자 크기는 유지했다.
